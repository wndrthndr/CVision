# app.py
# Faster ATS Resume Analyzer
# Keeps the SAME frontend endpoint and SAME response structure
# Flask + pdfplumber + Gemini

import os
import io
import re
import json
import time
import hashlib
import traceback
from typing import List, Dict, Any, Tuple

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import RequestEntityTooLarge

import pdfplumber
import google.generativeai as genai


# =========================================================
# CONFIGURATION
# =========================================================

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment (.env)")

genai.configure(api_key=GEMINI_KEY)

PRIMARY_MODEL = "models/gemini-2.0-flash"
FALLBACK_MODELS = [
    "models/gemini-2.0-flash",
    "models/gemini-flash-latest",
]

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}

MAX_FILE_SIZE_MB = 5
MAX_PDF_PAGES = 4

# Prevent huge prompts from slowing Gemini down
MAX_RESUME_CHARS_FOR_AI = 11000
MAX_JD_CHARS_FOR_AI = 5500

# Simple temporary cache
CACHE_TTL_SECONDS = 30 * 60

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_MB * 1024 * 1024


# =========================================================
# GEMINI MODEL OBJECTS
# Create once instead of recreating for every request
# =========================================================

gemini_models = {}

for model_name in [PRIMARY_MODEL] + FALLBACK_MODELS:
    try:
        gemini_models[model_name] = genai.GenerativeModel(model_name)
    except Exception as e:
        app.logger.warning(f"Could not initialize {model_name}: {e}")


# =========================================================
# SIMPLE IN-MEMORY CACHE
# Resets when server restarts. Good enough for now.
# =========================================================

analysis_cache: Dict[str, Dict[str, Any]] = {}


def create_cache_key(resume_text: str, job_description: str) -> str:
    raw = resume_text + "|||" + job_description
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cached_result(cache_key: str):
    item = analysis_cache.get(cache_key)

    if not item:
        return None

    if time.time() - item["created_at"] > CACHE_TTL_SECONDS:
        del analysis_cache[cache_key]
        return None

    return item["data"]


def save_cached_result(cache_key: str, data: Dict[str, Any]):
    analysis_cache[cache_key] = {
        "created_at": time.time(),
        "data": data
    }


# =========================================================
# FILE / PDF HELPERS
# =========================================================

def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def read_pdf_text(pdf_bytes: bytes) -> str:
    """
    Reads only first MAX_PDF_PAGES pages.
    This avoids slow processing on huge PDFs.
    """
    text_parts = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = pdf.pages[:MAX_PDF_PAGES]

        for page in pages:
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""

            text_parts.append(page_text)

    return "\n".join(text_parts)


def normalize_spaced_letters(text: str) -> str:
    """
    Example:
    N U K A L A V I S H A L
    becomes:
    NUKALA VISHAL
    """

    def join_letters_line(line: str) -> str:
        parts = line.split()

        if not parts:
            return line

        single_letters = sum(
            1 for part in parts
            if len(re.sub(r"\W", "", part)) == 1
        )

        if single_letters >= max(2, len(parts) * 0.5):
            joined = []
            buffer = []

            for part in parts:
                clean_part = re.sub(r"\W", "", part)

                if len(clean_part) == 1:
                    buffer.append(clean_part)
                else:
                    if buffer:
                        joined.append("".join(buffer))
                        buffer = []

                    joined.append(part)

            if buffer:
                joined.append("".join(buffer))

            return " ".join(joined)

        return line

    return "\n".join(join_letters_line(line) for line in text.splitlines())


def fix_hyphenation(text: str) -> str:
    text = re.sub(r"-\s*\n\s*", "", text)
    text = text.replace("\u00AD", "")
    return text


def collapse_whitespace(text: str) -> str:
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_extracted_text(raw: str) -> str:
    text = normalize_spaced_letters(raw)
    text = fix_hyphenation(text)
    text = collapse_whitespace(text)

    return text


# =========================================================
# LOCAL PARSING / ATS SCORING
# =========================================================

COMMON_SKILLS = {
    "python", "java", "javascript", "typescript",
    "react", "reactjs", "react.js",
    "node", "nodejs", "node.js",
    "express", "spring", "spring boot",
    "sql", "mysql", "postgres", "postgresql",
    "mongodb", "firebase",
    "aws", "azure", "gcp",
    "docker", "kubernetes",
    "git", "github",
    "html", "css", "tailwind",
    "flask", "django",
    "machine learning", "deep learning",
    "data science", "nlp",
    "tensorflow", "pytorch",
    "rest api", "jwt", "redis", "kafka"
}


def normalize_skill(skill: str) -> str:
    aliases = {
        "reactjs": "react",
        "react.js": "react",
        "nodejs": "node",
        "node.js": "node",
        "postgresql": "postgres",
    }

    return aliases.get(skill.lower().strip(), skill.lower().strip())


def extract_contact_info(text: str) -> Dict[str, str]:
    email_re = re.compile(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
    )

    phone_re = re.compile(
        r"(\+?\d[\d\-\s\(\)]{7,}\d)"
    )

    email = email_re.search(text)
    phone = phone_re.search(text)

    name = ""

    for line in text.splitlines()[:6]:
        line = line.strip()

        if (
            line
            and "@" not in line
            and not re.search(r"\d", line)
            and len(line.split()) <= 5
        ):
            name = line
            break

    return {
        "name": name,
        "email": email.group(0) if email else "",
        "phone": phone.group(0) if phone else ""
    }


def extract_skills_from_text(text: str) -> List[str]:
    lower_text = text.lower()
    found = set()

    # Multi-word skills
    for skill in COMMON_SKILLS:
        if " " in skill and skill in lower_text:
            found.add(normalize_skill(skill))

    # Single-word skills
    tokens = set(re.findall(r"[A-Za-z\+\#\.\-_]{2,}", lower_text))

    for token in tokens:
        normalized = normalize_skill(token)

        if normalized in COMMON_SKILLS:
            found.add(normalized)

    return sorted(found)


def estimate_experience_years(text: str) -> float:
    years = re.findall(r"\b(?:19|20)\d{2}\b", text)
    years = [int(year) for year in years]

    if len(years) >= 2:
        difference = max(years) - min(years)

        if 0 <= difference <= 20:
            return float(difference)

    match = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*years?", text.lower())

    if match:
        return float(match.group(1))

    return 0.0


def count_achievements(text: str) -> int:
    lower_text = text.lower()

    percentage_count = len(re.findall(r"\b\d+%", lower_text))

    action_count = len(re.findall(
        r"\b(improved|reduced|increased|decreased|boosted|saved|optimized|achieved)\b",
        lower_text
    ))

    return percentage_count + action_count


def formatting_risk_score(text: str) -> int:
    score = 100

    if re.search(r"(\b[A-Z]\s){3,}", text):
        score -= 30

    lines = [line for line in text.splitlines() if line.strip()]
    short_lines = sum(1 for line in lines if len(line) < 40)

    if len(lines) > 10 and short_lines / max(1, len(lines)) > 0.45:
        score -= 25

    if re.search(r"[^\w\s]{6,}", text):
        score -= 20

    return max(0, min(100, score))


def grammar_readability_score(text: str) -> int:
    sentences = re.split(r"[.!?]\s+", text)
    sentences = [sentence for sentence in sentences if sentence.strip()]

    if not sentences:
        return 50

    average_words = (
        sum(len(sentence.split()) for sentence in sentences)
        / len(sentences)
    )

    if average_words < 8 or average_words > 30:
        score = 60
    else:
        score = 85

    fragments = sum(
        1 for sentence in sentences
        if len(sentence.split()) < 3
    )

    score -= min(20, fragments)

    return max(0, min(100, int(score)))


def keyword_alignment_score(
    resume_skills: List[str],
    jd_text: str
) -> Tuple[int, List[str], List[str]]:

    jd_skills = set(extract_skills_from_text(jd_text))
    resume_set = set(normalize_skill(skill) for skill in resume_skills)

    if not jd_skills:
        return 50, [], []

    matched = sorted(resume_set.intersection(jd_skills))
    missing = sorted(jd_skills.difference(resume_set))

    score = int((len(matched) / len(jd_skills)) * 100)

    return score, matched, missing


def aggregate_scores(subscores: Dict[str, int]) -> int:
    weights = {
        "keyword": 0.45,
        "experience": 0.20,
        "achievements": 0.15,
        "formatting": 0.10,
        "grammar": 0.10
    }

    final = 0

    for key, value in subscores.items():
        final += value * weights.get(key, 0)

    return max(0, min(100, int(round(final))))


# =========================================================
# GEMINI
# =========================================================

PROMPT_SCHEMA = """
You are an expert ATS resume analyzer.

Return EXACTLY one valid JSON object.
Return no markdown.
Return no explanation outside the JSON.

Use this exact structure:

{
  "overall_match_score": 0,
  "keyword_alignment": {
    "matched": [],
    "missing": []
  },
  "experience_relevance_score": 0,
  "skill_strengths": [],
  "skill_gaps": [],
  "achievement_rewrites": [],
  "formatting_issues": [],
  "grammar_issues": [],
  "final_recommendation": ""
}

Rules:
- Keep every list short: maximum 3 items.
- Keep every item concise.
- achievement_rewrites: maximum 3 rewritten bullet points.
- Do not write long explanations.
- Return valid JSON only.
"""


def extract_json_from_text(raw: str) -> Dict[str, Any]:
    text = raw.strip()

    # Remove markdown code fences if Gemini adds them
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("No JSON object found in Gemini response")

    candidate = text[start:end + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        # Repair trailing commas
        candidate = re.sub(r",\s*}", "}", candidate)
        candidate = re.sub(r",\s*]", "]", candidate)

        return json.loads(candidate)


def call_gemini_with_retries(
    prompt_text: str,
    max_retries_per_model: int = 0
) -> Tuple[Dict[str, Any], str]:
    """
    Uses primary model, then fallback models.
    One retry only, so users do not wait too long.
    """

    last_error = None

    for model_name in [PRIMARY_MODEL] + FALLBACK_MODELS:
        model = gemini_models.get(model_name)

        if not model:
            continue

        for attempt in range(max_retries_per_model + 1):
            try:
                response = model.generate_content(prompt_text)

                raw_text = getattr(response, "text", None)

                if not raw_text:
                    raise ValueError("Gemini returned an empty response")

                parsed_json = extract_json_from_text(raw_text)

                return parsed_json, model_name

            except Exception as error:
                last_error = error
                app.logger.warning(
                    f"Gemini failed: {model_name}, attempt {attempt + 1}: {error}"
                )

                if attempt < max_retries_per_model:
                    time.sleep(0.5)

    raise RuntimeError(f"All Gemini models failed: {last_error}")


def build_fast_prompt(
    cleaned_text: str,
    job_description: str,
    local_matched: List[str],
    local_missing: List[str],
    local_score: int
) -> str:
    """
    Keeps the same Gemini response structure,
    but sends less data and requests shorter output.
    """

    resume_for_ai = cleaned_text[:MAX_RESUME_CHARS_FOR_AI]
    jd_for_ai = job_description[:MAX_JD_CHARS_FOR_AI]

    return f"""
{PROMPT_SCHEMA}

JOB DESCRIPTION:
{jd_for_ai}

RESUME:
{resume_for_ai}

LOCAL ANALYSIS CONTEXT:
Local score: {local_score}
Locally matched skills: {", ".join(local_matched[:12]) if local_matched else "None"}
Locally missing skills: {", ".join(local_missing[:12]) if local_missing else "None"}

Use the local context where useful, but analyze the resume yourself.

Return only JSON.
"""


def patch_gemini_response(
    gemini_json: Dict[str, Any],
    computed_overall: int,
    keyword_matched: List[str],
    keyword_missing: List[str],
    experience_score: int,
    resume_skills: List[str]
) -> Dict[str, Any]:
    """
    Ensures exact keys always exist,
    so your frontend never breaks.
    """

    patched = dict(gemini_json)

    patched.setdefault("overall_match_score", computed_overall)
    patched.setdefault("keyword_alignment", {
        "matched": keyword_matched,
        "missing": keyword_missing
    })
    patched.setdefault("experience_relevance_score", experience_score)
    patched.setdefault("skill_strengths", [])
    patched.setdefault("skill_gaps", [])
    patched.setdefault("achievement_rewrites", [])
    patched.setdefault("formatting_issues", [])
    patched.setdefault("grammar_issues", [])
    patched.setdefault("final_recommendation", "")

    # If AI gives empty / invalid keyword alignment, use local result
    if not isinstance(patched.get("keyword_alignment"), dict):
        patched["keyword_alignment"] = {
            "matched": keyword_matched,
            "missing": keyword_missing
        }

    if not patched["keyword_alignment"].get("matched"):
        patched["keyword_alignment"]["matched"] = keyword_matched

    if not patched["keyword_alignment"].get("missing"):
        patched["keyword_alignment"]["missing"] = keyword_missing

    # Ensure score is valid
    if not isinstance(patched.get("overall_match_score"), int):
        patched["overall_match_score"] = computed_overall

    if not isinstance(patched.get("experience_relevance_score"), int):
        patched["experience_relevance_score"] = experience_score

    # Local fallbacks
    if not patched["skill_strengths"]:
        patched["skill_strengths"] = resume_skills[:3]

    if not patched["skill_gaps"]:
        patched["skill_gaps"] = keyword_missing[:3]

    if not patched["final_recommendation"]:
        patched["final_recommendation"] = (
            "Add more role-specific keywords and quantify your achievements with measurable results."
        )

    # Limit long model output for faster frontend rendering
    patched["skill_strengths"] = patched["skill_strengths"][:3]
    patched["skill_gaps"] = patched["skill_gaps"][:3]
    patched["achievement_rewrites"] = patched["achievement_rewrites"][:3]
    patched["formatting_issues"] = patched["formatting_issues"][:3]
    patched["grammar_issues"] = patched["grammar_issues"][:3]

    return patched


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(RequestEntityTooLarge)
def file_too_large(error):
    return jsonify({
        "error": f"File too large. Maximum allowed size is {MAX_FILE_SIZE_MB} MB."
    }), 413


# =========================================================
# MAIN ENDPOINT
# SAME ENDPOINT AND SAME FRONTEND FORMAT AS ORIGINAL
# =========================================================

@app.route("/analyze-job", methods=["POST"])
def analyze_job_resume():
    start_time = time.time()

    try:
        # -------------------------------------------------
        # 1. Receive frontend form fields
        # -------------------------------------------------
        job_description = request.form.get("job_description", "").strip()

        if not job_description:
            return jsonify({
                "error": "job_description is required"
            }), 400

        if "resume_file" not in request.files:
            return jsonify({
                "error": "resume_file missing"
            }), 400

        file = request.files["resume_file"]

        if file.filename == "":
            return jsonify({
                "error": "No file selected"
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                "error": "Only PDF files allowed"
            }), 400

        pdf_bytes = file.read()

        if not pdf_bytes:
            return jsonify({
                "error": "Uploaded PDF is empty"
            }), 400

        # -------------------------------------------------
        # 2. Extract PDF text
        # -------------------------------------------------
        extraction_start = time.time()

        raw_text = read_pdf_text(pdf_bytes)
        cleaned_text = clean_extracted_text(raw_text)

        extraction_seconds = round(time.time() - extraction_start, 2)

        if len(cleaned_text.split()) < 20:
            return jsonify({
                "error": "Could not extract readable text from this PDF. Please upload a text-based PDF resume."
            }), 400

        # -------------------------------------------------
        # 3. Check cache
        # -------------------------------------------------
        cache_key = create_cache_key(cleaned_text, job_description)
        cached_response = get_cached_result(cache_key)

        if cached_response:
            # Same original response shape + optional speed details
            cached_response["performance"] = {
                "cache_hit": True,
                "total_seconds": round(time.time() - start_time, 2)
            }

            return jsonify(cached_response), 200

        # -------------------------------------------------
        # 4. Local analysis
        # -------------------------------------------------
        local_start = time.time()

        contact = extract_contact_info(cleaned_text)
        resume_skills = extract_skills_from_text(cleaned_text)

        exp_years = estimate_experience_years(cleaned_text)
        achievements_count = count_achievements(cleaned_text)

        formatting_score_local = formatting_risk_score(cleaned_text)
        grammar_score_local = grammar_readability_score(cleaned_text)

        keyword_score_val, matched, missing = keyword_alignment_score(
            resume_skills,
            job_description
        )

        # Do not punish freshers too hard
        experience_score_val = (
            int(min(100, exp_years * 18))
            if exp_years > 0
            else 55
        )

        achievements_score_val = min(100, achievements_count * 20)

        subs = {
            "keyword": keyword_score_val,
            "experience": experience_score_val,
            "achievements": achievements_score_val,
            "formatting": formatting_score_local,
            "grammar": grammar_score_local
        }

        computed_overall = aggregate_scores(subs)

        local_seconds = round(time.time() - local_start, 2)

        # -------------------------------------------------
        # 5. Gemini call
        # -------------------------------------------------
        prompt_text = build_fast_prompt(
            cleaned_text=cleaned_text,
            job_description=job_description,
            local_matched=matched,
            local_missing=missing,
            local_score=computed_overall
        )

        gemini_start = time.time()

        gemini_json, last_model_used = call_gemini_with_retries(
            prompt_text,
            max_retries_per_model=1
        )

        gemini_seconds = round(time.time() - gemini_start, 2)

        # -------------------------------------------------
        # 6. Patch response to protect frontend
        # -------------------------------------------------
        patched = patch_gemini_response(
            gemini_json=gemini_json,
            computed_overall=computed_overall,
            keyword_matched=matched,
            keyword_missing=missing,
            experience_score=experience_score_val,
            resume_skills=resume_skills
        )

        # -------------------------------------------------
        # 7. SAME RESPONSE FORMAT AS YOUR ORIGINAL BACKEND
        # -------------------------------------------------
        response_payload = {
            "resume_extracted_text": cleaned_text,
            "resume_word_count": len(cleaned_text.split()),
            "job_description_received": job_description,
            "model_used": last_model_used,
            "local_parsing": {
                "contact": contact,
                "detected_skills": resume_skills,
                "experience_years_estimate": exp_years,
                "achievements_count": achievements_count
            },
            "gemini_analysis": patched,
            "subscores_computed_locally": subs,

            # Extra field: frontend can ignore this safely
            "performance": {
                "cache_hit": False,
                "pdf_extraction_seconds": extraction_seconds,
                "local_processing_seconds": local_seconds,
                "gemini_seconds": gemini_seconds,
                "total_seconds": round(time.time() - start_time, 2)
            }
        }

        save_cached_result(cache_key, response_payload)

        return jsonify(response_payload), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "error": "Internal server error",
            "detail": str(e)
        }), 500


# =========================================================
# OPTIONAL HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "models_available": list(gemini_models.keys())
    }), 200


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )
