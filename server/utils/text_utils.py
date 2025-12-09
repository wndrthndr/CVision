# utils/text_utils.py

import re

def normalize_word(word: str) -> str:
    """Lowercase and remove punctuation"""
    return re.sub(r"[^\w]", "", word.lower()).strip()

def tokenize(text: str):
    """Simple word tokenizer"""
    text = text.lower()
    # Replace punctuation with space
    text = re.sub(r"[^\w\s]", " ", text)
    # Split into words
    return [w for w in text.split() if w.strip()]
