# app.py  — Industry-grade ATS Engine v2 (Flask + Gemini)
import os
import io
import json
import re
import time
import traceback
from typing import List, Dict, Any, Tuple

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

import pdfplumber
import google.generativeai as genai

# Load env
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment (.env)")

# Configure Gemini
genai.configure(api_key=GEMINI_KEY)

# Models to try (primary first, then fallbacks)
PRIMARY_MODEL = "models/gemini-2.5-flash"
FALLBACK_MODELS = ["models/gemini-flash-latest", "models/gemini-2.0-flash"]

# Flask app
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

ALLOWED_EXTENSIONS = {"pdf"}


# ------------------------
# Utilities: File & text
# ------------------------
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def read_pdf_text(path_or_bytes) -> str:
    """
    Extract raw text from PDF using pdfplumber.
    Accepts a filepath or bytes-like object.
    """
    text_parts = []
    if isinstance(path_or_bytes, (bytes, bytearray)):
        fp = io.BytesIO(path_or_bytes)
        pdf = pdfplumber.open(fp)
    else:
        pdf = pdfplumber.open(path_or_bytes)

    try:
        for page in pdf.pages:
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""
            text_parts.append(page_text)
    finally:
        pdf.close()

    raw = "\n".join(text_parts)
    return raw


def normalize_spaced_letters(text: str) -> str:
    """
    Convert 'N U K A L A' -> 'NUKALA' but keep normal spacing.
    Heuristic: if a token is single letters separated by spaces on same line -> join them.
    """
    def _join_letters_line(line: str) -> str:
        # If line mostly single letters separated by spaces -> join
        # e.g. "N U K A L A  V I S H A L" -> "NUKALA VISHAL"
        parts = line.split()
        if not parts:
            return line
        # count single-letter tokens and tokens with punctuation
        single_letters = sum(1 for p in parts if len(re.sub(r'\W','',p)) == 1)
        if single_letters >= max(2, len(parts) * 0.5):
            # group consecutive single letters into words separated by double spaces or punctuation
            joined = []
            buffer = []
            for p in parts:
                if len(re.sub(r'\W','',p)) == 1:
                    buffer.append(re.sub(r'\W','',p))
                else:
                    if buffer:
                        joined.append("".join(buffer))
                        buffer = []
                    joined.append(p)
            if buffer:
                joined.append("".join(buffer))
            return " ".join(joined)
        return line

    lines = text.splitlines()
    out_lines = [_join_letters_line(ln) for ln in lines]
    return "\n".join(out_lines)


def fix_hyphenation(text: str) -> str:
    """
    Join words split across lines with hyphens or soft hyphenation.
    Example: 'multi-\ntenant' -> 'multi-tenant' or ideally 'multitenant' but we'll join gracefully.
    """
    # Replace '-\n' (hyphen at EOL) with empty string (join words)
    text = re.sub(r"-\s*\n\s*", "", text)
    # Replace soft hyphen chars and multiple spaces/newlines
    text = text.replace("\u00AD", "")
    # Remove accidental line-joins like 'devel-\nopment' -> 'development' handled above
    return text


def collapse_whitespace(text: str) -> str:
    # Collapse many blank lines and normalize spaces
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def clean_extracted_text(raw: str) -> str:
    t = raw
    t = normalize_spaced_letters(t)
    t = fix_hyphenation(t)
    t = collapse_whitespace(t)
    # Trim long heading lines that are noise sometimes (optional)
    return t


# ------------------------
# Utilities: Parsing & scoring
# ------------------------
# Minimal skill lexicon — expand as required
COMMON_SKILLS = {
    "python", "java", "javascript", "react", "node", "sql", "postgres", "mysql",
    "mongodb", "aws", "docker", "kubernetes", "git", "html", "css", "tensorflow",
    "pytorch", "machine learning", "data science", "nlp", "flask", "django"
}

def extract_contact_info(text: str) -> Dict[str, str]:
    email_re = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
    phone_re = re.compile(r"(\+?\d[\d\-\s\(\)]{7,}\d)")
    email = email_re.search(text)
    phone = phone_re.search(text)
    # name heuristic: first non-empty line that has alphabetic characters and not email/phone
    name = ""
    for ln in text.splitlines()[:6]:
        ln_clean = ln.strip()
        if ln_clean and "@" not in ln_clean and not re.search(r"\d", ln_clean) and len(ln_clean.split()) <= 5:
            name = ln_clean
            break
    return {"name": name, "email": email.group(0) if email else "", "phone": phone.group(0) if phone else ""}


def extract_skills_from_text(text: str) -> List[str]:
    found = set()
    lower = text.lower()
    # multi-word checks
    for kw in ["machine learning", "data science", "deep learning", "react js", "node js"]:
        if kw in lower:
            found.add(kw)
    # token-level checks
    tokens = re.findall(r"[A-Za-z\+\#\-\_]{2,}", lower)
    for t in tokens:
        if t in COMMON_SKILLS:
            found.add(t)
    # fuzzy: check if a token appears as substring of a skill (e.g., 'k8s' not handled)
    return sorted(found)


def estimate_experience_years(text: str) -> float:
    # Look for year ranges like 2020-2023 or full dates
    years = re.findall(r"(19|20)\d{2}", text)
    years = [int(y) for y in years]
    if len(years) >= 2:
        # naive: range difference between min and max
        return float(max(years) - min(years))
    # fallback: look for "X years" mentions
    m = re.search(r"(\d+)\s+years?", text.lower())
    if m:
        return float(m.group(1))
    return 0.0


def count_achievements(text: str) -> int:
    # Count numeric achievements like '30%', 'increased by 20', 'reduced X by 30%'
    count = 0
    count += len(re.findall(r"\b\d+%|\b\d+\s?percent\b", text.lower()))
    count += len(re.findall(r"\b(improved|reduced|increased|decreased|boosted|saved)\b", text.lower()))
    return count


def formatting_risk_score(text: str) -> int:
    """
    Higher score = better formatting (less risk).
    Heuristic penalties for:
     - Single-letter spaced words
     - Very short lines with many spaces (columns)
     - Presence of many non-word characters
    """
    score = 100
    # penalize single-letter spaced patterns
    if re.search(r'(\b[A-Z]\s){3,}', text):
        score -= 30
    # penalty if lots of short lines (multi-column)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    short_lines = sum(1 for ln in lines if len(ln) < 40)
    if len(lines) > 10 and short_lines / max(1, len(lines)) > 0.45:
        score -= 25
    # penalty for long weird char runs
    if re.search(r"[^\w\s]{6,}", text):
        score -= 20
    return max(0, min(100, score))


def grammar_readability_score(text: str) -> int:
    # crude heuristic: average sentence length and punctuation frequency
    sentences = re.split(r'[.!?]\s+', text)
    sentences = [s for s in sentences if s.strip()]
    if not sentences:
        return 50
    avg_words = sum(len(s.split()) for s in sentences) / len(sentences)
    # ideal avg between 10 and 22
    if avg_words < 8 or avg_words > 30:
        base = 60
    else:
        base = 85
    # small penalty for many fragments
    fragments = sum(1 for s in sentences if len(s.split()) < 3)
    base -= min(20, fragments)
    return max(0, min(100, int(base)))


def keyword_alignment_score(resume_skills: List[str], jd_text: str) -> Tuple[int, List[str], List[str]]:
    """
    Compute simple keyword match: which JD keywords appear in resume_skills.
    JD keywords extracted by naive tokenization and lookup into COMMON_SKILLS plus tokens >2 chars.
    """
    jd_lower = jd_text.lower()
    jd_tokens = set(re.findall(r"[a-z\+\#\-\_]{2,}", jd_lower))
    # preferred jd keywords: intersection with known skills
    jd_skills = set([t for t in jd_tokens if t in COMMON_SKILLS])
    # fallback: take top tokens from JD (this is naive)
    if not jd_skills:
        # try to pick tokens that look like skill tokens (letters and plus/hashtag)
        jd_skills = set(list(jd_tokens)[:10])
    resume_set = set([s.lower() for s in resume_skills])
    matched = sorted([s for s in resume_set if s in jd_skills])
    missing = sorted([s for s in jd_skills if s not in resume_set])
    # score: percent matched (if jd_skills empty -> neutral 50)
    if not jd_skills:
        score = 50
    else:
        score = int((len(matched) / len(jd_skills)) * 100)
    return score, matched, missing


def aggregate_scores(subscores: Dict[str, int], weights=None) -> int:
    if weights is None:
        weights = {
            "keyword": 0.45,
            "experience": 0.2,
            "achievements": 0.15,
            "formatting": 0.1,
            "grammar": 0.1
        }
    final = 0.0
    for k, v in subscores.items():
        w = weights.get(k, 0)
        final += v * w
    return max(0, min(100, int(round(final))))


# ------------------------
# Utilities: Gemini prompt + safe JSON parse
# ------------------------
PROMPT_SCHEMA = """
You are an expert ATS resume analyzer that must return EXACTLY one valid JSON object (no explanation).
Given a Job Description and a Resume, return a JSON object that contains the following keys:
- overall_match_score: integer 0-100
- keyword_alignment: { matched: [strings], missing: [strings] }
- experience_relevance_score: integer 0-100
- skill_strengths: list of 3-5 short strings (bullets)
- skill_gaps: list of 3-5 short strings
- achievement_rewrites: list of up to 5 suggested rewritten bullet points (concise)
- formatting_issues: list of formatting problems (strings)
- grammar_issues: list of grammar/style issues (strings)
- final_recommendation: short 1-2 sentence recommendation

Return ONLY the JSON. No extra commentary.
"""

def call_gemini_with_retries(prompt_text: str, model_name: str, max_retries=2, timeout_seconds=30) -> str:
    """
    Call the given model. Return raw text (string).
    Try simple retry loop. Raise Exception on persistent failure.
    """
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            model = genai.GenerativeModel(model_name)
            # prefer generate_content when passing prompt string directly
            response = model.generate_content(prompt_text)
            # response.text is the typical field
            raw = getattr(response, "text", None)
            if raw is None:
                # try other attributes
                raw = str(response)
            return raw
        except Exception as e:
            last_exc = e
            # small backoff
            time.sleep(0.6 * (attempt + 1))
    raise last_exc


def extract_json_from_text(raw: str) -> Tuple[dict, str]:
    """
    Find a JSON object inside raw text. Try best-effort fixes:
      - extract first {...}
      - replace single quotes -> double quotes
      - remove leading/trailing backticks or triple code fences
      - fix trailing commas
    Returns (parsed_dict, used_raw_string). Raises ValueError if cannot parse.
    """
    s = raw.strip()

    # Remove code fences
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.I)
    s = re.sub(r"\s*```$", "", s, flags=re.I)

    # Find first JSON object by finding first { and its matching }
    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model output.")
    # Try to find the matching end by counting braces
    brace = 0
    end = -1
    for i in range(start, len(s)):
        if s[i] == "{":
            brace += 1
        elif s[i] == "}":
            brace -= 1
            if brace == 0:
                end = i
                break
    if end == -1:
        # fallback: take from start to last }
        last = s.rfind("}")
        if last != -1:
            candidate = s[start:last+1]
        else:
            candidate = s[start:]
    else:
        candidate = s[start:end+1]

    # Quick tries to parse; if fails, attempt a few repairs
    tried = candidate
    # attempt 1: direct
    try:
        parsed = json.loads(tried)
        return parsed, tried
    except Exception:
        pass

    # attempt 2: replace single quotes with double quotes (but be careful)
    tried2 = re.sub(r"(?<!\\)'", '"', tried)
    try:
        parsed = json.loads(tried2)
        return parsed, tried2
    except Exception:
        pass

    # attempt 3: remove trailing commas before } or ]
    tried3 = re.sub(r",\s*([}\]])", r"\1", tried2)
    try:
        parsed = json.loads(tried3)
        return parsed, tried3
    except Exception:
        pass

    # attempt 4: remove non-JSON leading characters again and try to find inner {} blocks
    inner_matches = re.findall(r"\{(?:[^{}]|\{[^{}]*\})*\}", tried3)
    for block in inner_matches:
        try:
            parsed = json.loads(block)
            return parsed, block
        except Exception:
            continue

    # give up and raise with the last candidate for debugging
    raise ValueError("Failed to parse JSON from model output. Candidate excerpt: " + tried3[:1000])


# ------------------------
# Main endpoint
# ------------------------
@app.route("/analyze-job", methods=["POST"])
def analyze_job_resume():
    filepath = None
    try:
        job_description = request.form.get("job_description", "").strip()
        if not job_description:
            return jsonify({"error": "job_description is required"}), 400

        if "resume_file" not in request.files:
            return jsonify({"error": "resume_file missing"}), 400

        file = request.files["resume_file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        if not allowed_file(file.filename):
            return jsonify({"error": "Only PDF files allowed"}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        pdf_bytes = file.read()

        # 1) Extract text
        raw_text = read_pdf_text(pdf_bytes)
        cleaned_text = clean_extracted_text(raw_text)

        # 2) Quick local parse to support scoring and to provide fallback data
        contact = extract_contact_info(cleaned_text)
        resume_skills = extract_skills_from_text(cleaned_text)
        exp_years = estimate_experience_years(cleaned_text)
        achievements_count = count_achievements(cleaned_text)
        formatting_score_local = formatting_risk_score(cleaned_text)
        grammar_score_local = grammar_readability_score(cleaned_text)

        # 3) Build prompt for Gemini — include schema string
        system_prompt = PROMPT_SCHEMA
        # Keep the prompt concise and attach the JD + resume
        prompt_text = f"{system_prompt}\n\n---Job Description---\n{job_description}\n\n---Resume Text---\n{cleaned_text}\n\nReturn only JSON."

        # 4) Call Gemini with primary model, fallback if needed
        gemini_raw = None
        last_model_used = None
        models_to_try = [PRIMARY_MODEL]
        for m in models_to_try:
            try:
                gemini_raw = call_gemini_with_retries(prompt_text, m, max_retries=2)
                last_model_used = m
                break
            except Exception as e:
                # log and try next
                app.logger.warning(f"Model {m} failed: {e}")
                gemini_raw = None
                last_model_used = None
                continue

        if gemini_raw is None:
            return jsonify({"error": "AI model request failed (all fallbacks)."}), 500

        # 5) Robustly extract JSON from gemini_raw
        try:
            gemini_json, used_string = extract_json_from_text(gemini_raw)
            # ensure required keys exist; if missing, fill with local heuristics
        except Exception as e:
            # return raw output for debugging
            return jsonify({
                "error": "AI returned unparseable JSON",
                "raw_output": gemini_raw[:5000],
                "exception": str(e)
            }), 500

        # 6) If model omitted some fields, patch using local heuristics
        patched = dict(gemini_json)  # shallow copy
        # Ensure expected keys exist
        patched.setdefault("overall_match_score", None)
        patched.setdefault("keyword_alignment", {"matched": [], "missing": []})
        patched.setdefault("experience_relevance_score", None)
        patched.setdefault("skill_strengths", [])
        patched.setdefault("skill_gaps", [])
        patched.setdefault("achievement_rewrites", [])
        patched.setdefault("formatting_issues", [])
        patched.setdefault("grammar_issues", [])
        patched.setdefault("final_recommendation", "")

        # If overall_match_score missing, compute heuristic aggregate
        # Compute subscores
        keyword_score_val, matched, missing = keyword_alignment_score(resume_skills, job_description)
        experience_score_val = int(min(100, exp_years * 10)) if exp_years else 50
        achievements_score_val = min(100, achievements_count * 25)  # each achievement counts
        formatting_score_val = formatting_score_local
        grammar_score_val = grammar_score_local

        subs = {
            "keyword": keyword_score_val,
            "experience": experience_score_val,
            "achievements": achievements_score_val,
            "formatting": formatting_score_val,
            "grammar": grammar_score_val
        }
        computed_overall = aggregate_scores(subs)

        if not patched.get("overall_match_score"):
            patched["overall_match_score"] = computed_overall

        # Fill keyword_alignment if empty
        if not patched.get("keyword_alignment") or not patched["keyword_alignment"].get("matched"):
            patched["keyword_alignment"] = {"matched": matched, "missing": missing}

        if not patched.get("experience_relevance_score"):
            patched["experience_relevance_score"] = experience_score_val

        # patch skill_strengths / gaps from local detection if empty
        if not patched["skill_strengths"]:
            patched["skill_strengths"] = resume_skills[:5]
        if not patched["skill_gaps"]:
            patched["skill_gaps"] = missing[:5]

        # Add a short final recommendation if not provided
        if not patched.get("final_recommendation"):
            patched["final_recommendation"] = (
                "Consider adding more role-specific keywords and quantifying achievements with metrics."
            )

        # 7) Build response for frontend (include some local diagnostics)
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
        }

        return jsonify(response_payload), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    finally:
        # cleanup uploaded file
        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
