# utils/scorer.py
from typing import List, Dict
import math

# weights (tunable)
WEIGHTS = {
    "keyword": 0.45,
    "experience": 0.20,
    "achievements": 0.15,
    "formatting": 0.10,
    "grammar": 0.10
}

def keyword_score(resume_skills: List[str], jd_required: List[str], jd_preferred: List[str]):
    required = set([s.lower() for s in jd_required])
    preferred = set([s.lower() for s in jd_preferred])
    resume_set = set([s.lower() for s in resume_skills])
    if not required and not preferred:
        return 50
    req_match = len(resume_set & required)
    pref_match = len(resume_set & preferred)
    req_score = (req_match / max(1, len(required))) * 100
    pref_score = (pref_match / max(1, len(preferred))) * 100
    # required more important
    score = req_score * 0.7 + pref_score * 0.3
    return int(min(100, score))

def experience_score(parsed_experience, jd_min_years:int=0):
    # parsed_experience: list of experience objects with 'years' or year ranges
    total_years = 0
    for job in parsed_experience:
        total_years += job.get("years", 0)
    # simple mapping
    if jd_min_years <= 0:
        return min(100, total_years * 10)  # crude mapping
    else:
        return int(min(100, (total_years / jd_min_years) * 100))

def achievements_score(parsed_resume):
    # heuristic: count numeric achievements, percent increases, results
    text = parsed_resume.get("raw_text","")
    count = 0
    count += len(re.findall(r'\b\d+%|\b\d+\s?percent\b', text.lower()))
    count += len(re.findall(r'\b(improved|reduced|increased|decreased|boosted|saved)\b', text.lower()))
    return min(100, count * 20)

def formatting_risk_score(text):
    # detect tables, images, two-column patterns, icons, many special chars -> higher risk means lower score
    risk = 0
    if re.search(r'\[FIGURE\]|\bTABLE\b', text, flags=re.I):
        risk += 30
    # many single-letter spaced words
    if re.search(r'(\b[A-Z]\s){3,}', text):
        risk += 20
    # presence of <svg> or image tags or long runs of non-word characters
    if re.search(r'[^\w\s]{6,}', text):
        risk += 20
    score = max(0, 100 - risk)
    return int(score)

def grammar_score(text):
    # use simple heuristics, possibly call Gemini for grammar rating
    # for speed, do simple sentence-length and punctuation checks
    sentences = [s for s in re.split(r'[.!?]', text) if s.strip()]
    avg_len = sum(len(s.split()) for s in sentences) / max(1, len(sentences))
    # average sentence length ideal around 12-20 words
    if avg_len < 8 or avg_len > 30:
        base = 60
    else:
        base = 85
    return int(base)

def aggregate_score(subscores: Dict[str,int]):
    final = (
        subscores["keyword"] * WEIGHTS["keyword"] +
        subscores["experience"] * WEIGHTS["experience"] +
        subscores["achievements"] * WEIGHTS["achievements"] +
        subscores["formatting"] * WEIGHTS["formatting"] +
        subscores["grammar"] * WEIGHTS["grammar"]
    )
    return int(round(final))

