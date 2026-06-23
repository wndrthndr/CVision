# app.py
# Faster ATS Resume Analyzer
# Same frontend endpoint: POST /analyze-job
# Same frontend request fields:
#   - resume_file
#   - job_description
# Same frontend response fields:
#   - resume_extracted_text
#   - resume_word_count
#   - job_description_received
#   - model_used
#   - local_parsing
#   - gemini_analysis
#   - subscores_computed_locally
#   - performance

import os
import io
import re
import json
import time
import copy
import hashlib
import traceback
from typing import List, Dict, Any, Tuple, Optional

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
    raise RuntimeError(
        "GEMINI_API_KEY not found. Add it to your .env file."
    )

genai.configure(api_key=GEMINI_KEY)

# Fast primary model
PRIMARY_MODEL = "models/gemini-2.0-flash"

# Do NOT repeat PRIMARY_MODEL here
FALLBACK_MODELS = [
    "models/gemini-flash-latest",
]

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}

MAX_FILE_SIZE_MB = 5
MAX_PDF_PAGES = 4

# Gemini input limits
# Local scoring still reads full extracted resume text.
# Only the Gemini prompt is trimmed for speed.
MAX_RESUME_CHARS_FOR_AI = 7000
MAX_JD_CHARS_FOR_AI = 3500

# In-memory cache duration
CACHE_TTL_SECONDS = 30 * 60

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

# For development this allows your Next.js frontend to call Flask.
# For production, restrict origins to your actual frontend domain.
CORS(app)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_MB * 1024 * 1024


# =========================================================
# GEMINI MODEL OBJECTS
# Created once when server starts.
# =========================================================

gemini_models: Dict[str, Any] = {}

for model_name in [PRIMARY_MODEL] + FALLBACK_MODELS:
    try:
        gemini_models[model_name] = genai.GenerativeModel(model_name)
        app.logger.info(f"Gemini model loaded: {model_name}")
    except Exception as error:
        app.logger.warning(
            f"Could not initialize Gemini model {model_name}: {error}"
        )


# =========================================================
# SIMPLE IN-MEMORY CACHE
# This resets when Render/server restarts.
# Use Redis later if you need shared persistent caching.
# =========================================================

analysis_cache: Dict[str, Dict[str, Any]] = {}


def create_cache_key(resume_text: str, job_description: str) -> str:
    raw_value = f"{resume_text}|||{job_description}"
    return hashlib.sha256(raw_value.encode("utf-8")).hexdigest()


def get_cached_result(cache_key: str) -> Optional[Dict[str, Any]]:
    item = analysis_cache.get(cache_key)

    if not item:
        return None

    cache_age = time.time() - item["created_at"]

    if cache_age > CACHE_TTL_SECONDS:
        del analysis_cache[cache_key]
        return None

    return item["data"]


def save_cached_result(cache_key: str, data: Dict[str, Any]) -> None:
    analysis_cache[cache_key] = {
        "created_at": time.time(),
        "data": data,
    }


# =========================================================
# FILE / PDF HELPERS
# =========================================================

def allowed_file(filename: str) -> bool:
    return (
        bool(filename)
        and "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def read_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract text from the first MAX_PDF_PAGES pages only.
    This prevents oversized PDFs from slowing down requests.
    """
    text_parts: List[str] = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages_to_read = pdf.pages[:MAX_PDF_PAGES]

        for page in pages_to_read:
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""

            text_parts.append(page_text)

    return "\n".join(text_parts)


def normalize_spaced_letters(text: str) -> str:
    """
    Converts lines like:
      N U K A L A V I S H A L
    into:
      NUKALA VISHAL
    """

    def normalize_line(line: str) -> str:
        parts = line.split()

        if not parts:
            return line

        single_letter_count = sum(
            1
            for part in parts
            if len(re.sub(r"\W", "", part)) == 1
        )

        if single_letter_count < max(2, len(parts) * 0.5):
            return line

        rebuilt_parts: List[str] = []
        letter_buffer: List[str] = []

        for part in parts:
            cleaned_part = re.sub(r"\W", "", part)

            if len(cleaned_part) == 1:
                letter_buffer.append(cleaned_part)
            else:
                if letter_buffer:
                    rebuilt_parts.append("".join(letter_buffer))
                    letter_buffer = []

                rebuilt_parts.append(part)

        if letter_buffer:
            rebuilt_parts.append("".join(letter_buffer))

        return " ".join(rebuilt_parts)

    return "\n".join(normalize_line(line) for line in text.splitlines())


def fix_hyphenation(text: str) -> str:
    text = text.replace("\u00AD", "")
    text = re.sub(r"-\s*\n\s*", "", text)
    return text


def collapse_whitespace(text: str) -> str:
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_extracted_text(raw_text: str) -> str:
    text = normalize_spaced_letters(raw_text)
    text = fix_hyphenation(text)
    text = collapse_whitespace(text)
    return text


# =========================================================
# LOCAL ATS PARSING / SCORING
# =========================================================

COMMON_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "reactjs",
    "react.js",
    "next.js",
    "nextjs",
    "node",
    "nodejs",
    "node.js",
    "express",
    "spring",
    "spring boot",
    "sql",
    "mysql",
    "postgres",
    "postgresql",
    "mongodb",
    "firebase",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "github",
    "html",
    "css",
    "tailwind",
    "tailwind css",
    "flask",
    "django",
    "machine learning",
    "deep learning",
    "data science",
    "nlp",
    "tensorflow",
    "pytorch",
    "rest api",
    "api",
    "jwt",
    "redis",
    "kafka",
    "microservices",
    "linux",
    "figma",
    "postman",
}


def normalize_skill(skill: str) -> str:
    aliases = {
        "reactjs": "react",
        "react.js": "react",
        "nextjs": "next.js",
        "nodejs": "node",
        "node.js": "node",
        "postgresql": "postgres",
        "tailwind css": "tailwind",
    }

    cleaned_skill = skill.lower().strip()
    return aliases.get(cleaned_skill, cleaned_skill)


def extract_contact_info(text: str) -> Dict[str, str]:
    email_pattern = re.compile(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
    )

    phone_pattern = re.compile(
        r"(\+?\d[\d\-\s\(\)]{7,}\d)"
    )

    email_match = email_pattern.search(text)
    phone_match = phone_pattern.search(text)

    name = ""

    for line in text.splitlines()[:6]:
        candidate = line.strip()

        if (
            candidate
            and "@" not in candidate
            and not re.search(r"\d", candidate)
            and len(candidate.split()) <= 5
            and len(candidate) <= 60
        ):
            name = candidate
            break

    return {
        "name": name,
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
    }


def extract_skills_from_text(text: str) -> List[str]:
    lower_text = text.lower()
    found_skills = set()

    # Check multi-word skills first.
    for skill in COMMON_SKILLS:
        if " " in skill and skill in lower_text:
            found_skills.add(normalize_skill(skill))

    # Check single-word skills using word boundaries.
    for skill in COMMON_SKILLS:
        if " " in skill:
            continue

        escaped_skill = re.escape(skill)

        if re.search(rf"(?<![A-Za-z0-9]){escaped_skill}(?![A-Za-z0-9])", lower_text):
            found_skills.add(normalize_skill(skill))

    return sorted(found_skills)


def estimate_experience_years(text: str) -> float:
    explicit_match = re.search(
        r"(\d+(?:\.\d+)?)\s*\+?\s*years?",
        text.lower(),
    )

    if explicit_match:
        return float(explicit_match.group(1))

    years = [int(year) for year in re.findall(r"\b(?:19|20)\d{2}\b", text)]

    if len(years) >= 2:
        difference = max(years) - min(years)

        if 0 <= difference <= 20:
            return float(difference)

    return 0.0


def count_achievements(text: str) -> int:
    lower_text = text.lower()

    percentage_count = len(re.findall(r"\b\d+(?:\.\d+)?%", lower_text))

    quantified_count = len(
        re.findall(
            r"\b\d+(?:\.\d+)?\s*(?:x|users|clients|projects|hours|days|months)\b",
            lower_text,
        )
    )

    action_count = len(
        re.findall(
            r"\b("
            r"improved|reduced|increased|decreased|boosted|saved|"
            r"optimized|achieved|built|developed|implemented|automated"
            r")\b",
            lower_text,
        )
    )

    return percentage_count + quantified_count + action_count


def formatting_risk_score(text: str) -> int:
    score = 100

    if re.search(r"(\b[A-Z]\s){3,}", text):
        score -= 30

    lines = [line for line in text.splitlines() if line.strip()]

    if lines:
        short_lines = sum(1 for line in lines if len(line) < 40)

        if len(lines) > 10 and short_lines / len(lines) > 0.45:
            score -= 25

    if re.search(r"[^\w\s]{6,}", text):
        score -= 20

    if len(text.split()) < 80:
        score -= 15

    return max(0, min(100, score))


def grammar_readability_score(text: str) -> int:
    sentences = re.split(r"[.!?]\s+", text)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]

    if not sentences:
        return 50

    average_words = sum(
        len(sentence.split()) for sentence in sentences
    ) / len(sentences)

    score = 85 if 8 <= average_words <= 30 else 65

    fragments = sum(
        1
        for sentence in sentences
        if len(sentence.split()) < 3
    )

    score -= min(20, fragments)

    return max(0, min(100, int(score)))


def keyword_alignment_score(
    resume_skills: List[str],
    job_description: str,
) -> Tuple[int, List[str], List[str]]:
    jd_skills = set(extract_skills_from_text(job_description))
    resume_skill_set = {
        normalize_skill(skill)
        for skill in resume_skills
    }

    if not jd_skills:
        return 50, [], []

    matched_skills = sorted(resume_skill_set.intersection(jd_skills))
    missing_skills = sorted(jd_skills.difference(resume_skill_set))

    score = int((len(matched_skills) / len(jd_skills)) * 100)

    return score, matched_skills, missing_skills


def aggregate_scores(subscores: Dict[str, int]) -> int:
    weights = {
        "keyword": 0.45,
        "experience": 0.20,
        "achievements": 0.15,
        "formatting": 0.10,
        "grammar": 0.10,
    }

    final_score = sum(
        score * weights.get(score_name, 0)
        for score_name, score in subscores.items()
    )

    return max(0, min(100, round(final_score)))


# =========================================================
# GEMINI PROMPT / RESPONSE HELPERS
# =========================================================

PROMPT_SCHEMA = """
You are an expert ATS resume analyzer.

Return EXACTLY one valid JSON object.
Do not return markdown.
Do not return explanations outside the JSON.

Use this exact JSON structure:

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
- Keep every list to a maximum of 3 items.
- Keep each item concise and useful.
- achievement_rewrites must contain at most 3 improved resume bullet examples.
- Do not invent experience, skills, companies, numbers, or achievements.
- If evidence is unavailable, say it is missing instead of making it up.
- Return valid JSON only.
"""


def extract_json_from_text(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()

    # Gemini occasionally returns fenced JSON despite instructions.
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    start_index = text.find("{")
    end_index = text.rfind("}")

    if start_index == -1 or end_index == -1:
        raise ValueError("No JSON object found in Gemini response")

    json_candidate = text[start_index:end_index + 1]

    try:
        return json.loads(json_candidate)
    except json.JSONDecodeError:
        # Small repair for trailing commas.
        repaired_candidate = re.sub(r",\s*}", "}", json_candidate)
        repaired_candidate = re.sub(r",\s*]", "]", repaired_candidate)

        return json.loads(repaired_candidate)


def call_gemini_with_fallback(
    prompt_text: str,
) -> Tuple[Dict[str, Any], str]:
    """
    Each model is tried only once.
    This is deliberate: it avoids a long user wait caused by repeated retries.
    """
    last_error: Optional[Exception] = None

    for model_name in [PRIMARY_MODEL] + FALLBACK_MODELS:
        model = gemini_models.get(model_name)

        if not model:
            continue

        try:
            response = model.generate_content(prompt_text)

            raw_text = getattr(response, "text", "")

            if not raw_text:
                raise ValueError("Gemini returned an empty response")

            parsed_response = extract_json_from_text(raw_text)

            return parsed_response, model_name

        except Exception as error:
            last_error = error
            app.logger.warning(
                f"Gemini request failed with {model_name}: {error}"
            )

    raise RuntimeError(
        f"All configured Gemini models failed. Last error: {last_error}"
    )


def build_fast_prompt(
    cleaned_resume_text: str,
    job_description: str,
    local_matched_skills: List[str],
    local_missing_skills: List[str],
    local_score: int,
) -> str:
    """
    Gemini sees shortened text for speed.
    Local analysis still uses the complete extracted resume.
    """
    resume_for_ai = cleaned_resume_text[:MAX_RESUME_CHARS_FOR_AI]
    jd_for_ai = job_description[:MAX_JD_CHARS_FOR_AI]

    matched_text = ", ".join(local_matched_skills[:12]) or "None"
    missing_text = ", ".join(local_missing_skills[:12]) or "None"

    return f"""
{PROMPT_SCHEMA}

JOB DESCRIPTION:
{jd_for_ai}

RESUME:
{resume_for_ai}

LOCAL ANALYSIS CONTEXT:
Local score: {local_score}
Locally matched skills: {matched_text}
Locally missing skills: {missing_text}

Use the local context where helpful, but verify claims against the resume.
Return only JSON.
"""


def ensure_list(value: Any, max_items: int = 3) -> List[str]:
    if not isinstance(value, list):
        return []

    cleaned_items = []

    for item in value:
        if isinstance(item, str) and item.strip():
            cleaned_items.append(item.strip())

    return cleaned_items[:max_items]


def ensure_int_score(value: Any, fallback: int) -> int:
    if isinstance(value, bool):
        return fallback

    if isinstance(value, (int, float)):
        return max(0, min(100, int(round(value))))

    return fallback


def patch_gemini_response(
    gemini_json: Dict[str, Any],
    computed_overall_score: int,
    keyword_matched: List[str],
    keyword_missing: List[str],
    experience_score: int,
    resume_skills: List[str],
) -> Dict[str, Any]:
    """
    Guarantees the exact keys your frontend expects.
    """
    patched = dict(gemini_json) if isinstance(gemini_json, dict) else {}

    ai_keyword_alignment = patched.get("keyword_alignment")

    if not isinstance(ai_keyword_alignment, dict):
        ai_keyword_alignment = {}

    ai_matched = ensure_list(ai_keyword_alignment.get("matched"))
    ai_missing = ensure_list(ai_keyword_alignment.get("missing"))

    patched["overall_match_score"] = ensure_int_score(
        patched.get("overall_match_score"),
        computed_overall_score,
    )

    patched["keyword_alignment"] = {
        "matched": ai_matched or keyword_matched[:6],
        "missing": ai_missing or keyword_missing[:6],
    }

    patched["experience_relevance_score"] = ensure_int_score(
        patched.get("experience_relevance_score"),
        experience_score,
    )

    patched["skill_strengths"] = (
        ensure_list(patched.get("skill_strengths"))
        or resume_skills[:3]
    )

    patched["skill_gaps"] = (
        ensure_list(patched.get("skill_gaps"))
        or keyword_missing[:3]
    )

    patched["achievement_rewrites"] = ensure_list(
        patched.get("achievement_rewrites")
    )

    patched["formatting_issues"] = ensure_list(
        patched.get("formatting_issues")
    )

    patched["grammar_issues"] = ensure_list(
        patched.get("grammar_issues")
    )

    final_recommendation = patched.get("final_recommendation")

    if not isinstance(final_recommendation, str) or not final_recommendation.strip():
        final_recommendation = (
            "Add role-specific keywords and quantify your strongest achievements."
        )

    patched["final_recommendation"] = final_recommendation.strip()

    return patched


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(error):
    return jsonify({
        "error": (
            f"File too large. Maximum allowed size is "
            f"{MAX_FILE_SIZE_MB} MB."
        )
    }), 413


@app.errorhandler(404)
def handle_not_found(error):
    return jsonify({
        "error": "Route not found."
    }), 404


# =========================================================
# MAIN ENDPOINT
# =========================================================

@app.route("/analyze-job", methods=["POST"])
def analyze_job_resume():
    total_start_time = time.time()

    try:
        # -------------------------------------------------
        # 1. Validate frontend request
        # -------------------------------------------------
        job_description = request.form.get("job_description", "").strip()

        if not job_description:
            return jsonify({
                "error": "job_description is required."
            }), 400

        if "resume_file" not in request.files:
            return jsonify({
                "error": "resume_file is required."
            }), 400

        resume_file = request.files["resume_file"]

        if not resume_file or resume_file.filename == "":
            return jsonify({
                "error": "No resume file selected."
            }), 400

        if not allowed_file(resume_file.filename):
            return jsonify({
                "error": "Only PDF files are allowed."
            }), 400

        pdf_bytes = resume_file.read()

        if not pdf_bytes:
            return jsonify({
                "error": "Uploaded PDF is empty."
            }), 400

        # -------------------------------------------------
        # 2. Extract and clean PDF text
        # -------------------------------------------------
        extraction_start_time = time.time()

        raw_resume_text = read_pdf_text(pdf_bytes)
        cleaned_resume_text = clean_extracted_text(raw_resume_text)

        extraction_seconds = round(
            time.time() - extraction_start_time,
            2,
        )

        if len(cleaned_resume_text.split()) < 20:
            return jsonify({
                "error": (
                    "Could not extract enough readable text from this PDF. "
                    "Please upload a text-based PDF resume."
                )
            }), 400

        # -------------------------------------------------
        # 3. Cache lookup
        # -------------------------------------------------
        cache_key = create_cache_key(
            cleaned_resume_text,
            job_description,
        )

        cached_response = get_cached_result(cache_key)

        if cached_response:
            response_copy = copy.deepcopy(cached_response)

            response_copy["performance"] = {
                "cache_hit": True,
                "pdf_extraction_seconds": extraction_seconds,
                "local_processing_seconds": 0,
                "gemini_seconds": 0,
                "total_seconds": round(
                    time.time() - total_start_time,
                    2,
                ),
            }

            return jsonify(response_copy), 200

        # -------------------------------------------------
        # 4. Fast local ATS analysis
        # -------------------------------------------------
        local_start_time = time.time()

        contact_info = extract_contact_info(cleaned_resume_text)
        resume_skills = extract_skills_from_text(cleaned_resume_text)

        experience_years = estimate_experience_years(cleaned_resume_text)
        achievement_count = count_achievements(cleaned_resume_text)

        formatting_score = formatting_risk_score(cleaned_resume_text)
        grammar_score = grammar_readability_score(cleaned_resume_text)

        keyword_score, matched_skills, missing_skills = keyword_alignment_score(
            resume_skills,
            job_description,
        )

        # Friendly score for freshers.
        experience_score = (
            min(100, int(experience_years * 18))
            if experience_years > 0
            else 55
        )

        achievement_score = min(100, achievement_count * 20)

        subscores = {
            "keyword": keyword_score,
            "experience": experience_score,
            "achievements": achievement_score,
            "formatting": formatting_score,
            "grammar": grammar_score,
        }

        computed_overall_score = aggregate_scores(subscores)

        local_processing_seconds = round(
            time.time() - local_start_time,
            2,
        )

        # -------------------------------------------------
        # 5. Gemini AI analysis
        # -------------------------------------------------
        prompt_text = build_fast_prompt(
            cleaned_resume_text=cleaned_resume_text,
            job_description=job_description,
            local_matched_skills=matched_skills,
            local_missing_skills=missing_skills,
            local_score=computed_overall_score,
        )

        gemini_start_time = time.time()

        gemini_json, model_used = call_gemini_with_fallback(
            prompt_text
        )

        gemini_seconds = round(
            time.time() - gemini_start_time,
            2,
        )

        # -------------------------------------------------
        # 6. Make Gemini response safe for frontend
        # -------------------------------------------------
        gemini_analysis = patch_gemini_response(
            gemini_json=gemini_json,
            computed_overall_score=computed_overall_score,
            keyword_matched=matched_skills,
            keyword_missing=missing_skills,
            experience_score=experience_score,
            resume_skills=resume_skills,
        )

        # -------------------------------------------------
        # 7. Response shape expected by your frontend
        # -------------------------------------------------
        response_payload = {
            "resume_extracted_text": cleaned_resume_text,
            "resume_word_count": len(cleaned_resume_text.split()),
            "job_description_received": job_description,
            "model_used": model_used,
            "local_parsing": {
                "contact": contact_info,
                "detected_skills": resume_skills,
                "experience_years_estimate": experience_years,
                "achievements_count": achievement_count,
            },
            "gemini_analysis": gemini_analysis,
            "subscores_computed_locally": subscores,
            "performance": {
                "cache_hit": False,
                "pdf_extraction_seconds": extraction_seconds,
                "local_processing_seconds": local_processing_seconds,
                "gemini_seconds": gemini_seconds,
                "total_seconds": round(
                    time.time() - total_start_time,
                    2,
                ),
            },
        }

        save_cached_result(cache_key, response_payload)

        return jsonify(response_payload), 200

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "error": "Internal server error.",
            "detail": str(error),
        }), 500


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "models_available": list(gemini_models.keys()),
    }), 200


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True,  # Change to False when deploying
    )
