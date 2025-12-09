# utils/parser.py
import re
from collections import Counter
from .text_utils import tokenize, normalize_word

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s\-\(\)]{6,}\d)")

COMMON_SKILLS = {"python","java","react","node","sql","aws","docker","kubernetes","javascript","c++","c","html","css","tensorflow","pytorch"}

def extract_contact(text):
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    name = None
    # heuristic: first line with alphabetic words all-caps or Title Case
    first_lines = text.splitlines()[:6]
    for ln in first_lines:
        cleaned = ln.strip()
        if cleaned and len(cleaned.split()) <= 4 and not EMAIL_RE.search(cleaned) and not PHONE_RE.search(cleaned):
            # assume this is name line
            name = cleaned
            break
    return {"name": name or "", "email": email.group(0) if email else "", "phone": phone.group(0) if phone else ""}

def extract_skills(text):
    words = set([normalize_word(w) for w in tokenize(text)])
    found = sorted(list(words & COMMON_SKILLS))
    # also detect multi-word skills heuristically
    extras = []
    for token in ["machine learning","data science","deep learning","react js","node js"]:
        if token in text.lower():
            extras.append(token)
    return found + extras

def extract_experience_blocks(text):
    # naive split by common headings
    parts = re.split(r'\n(?:experience|work experience|professional experience)\b', text, flags=re.I)
    if len(parts) <= 1:
        return []
    else:
        exp_text = parts[1]
        # split into jobs by double newlines
        jobs = [s.strip() for s in re.split(r'\n{2,}', exp_text) if s.strip()][:6]
        res = []
        for job in jobs:
            # extract years
            years = re.findall(r'(20\d{2}|19\d{2})', job)
            res.append({"raw": job, "years": len(years)}) 
        return res
