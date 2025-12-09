# utils/extract_pdf.py
import fitz
import re
from typing import IO

def clean_extracted_text(text: str) -> str:
    # Remove weird spaced letters (N U K A L A -> NUKALA)
    text = re.sub(r"(?<=\w)\s(?=\w)", "", text)
    # Replace multiple newlines with a single newline
    text = re.sub(r"\n{2,}", "\n", text)
    # Collapse multiple spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Trim leading/trailing whitespace per line
    text = "\n".join([ln.strip() for ln in text.splitlines() if ln.strip()])
    return text.strip()

def extract_text_from_pdf(pdf_file: IO[bytes]) -> str:
    # pdf_file is file-like (BytesIO or UploadFile.file)
    # pdf_file.read() might be used by caller, but here ensure we can handle both
    stream = pdf_file if hasattr(pdf_file, "read") else None
    if stream:
        raw = stream.read()
    else:
        raise ValueError("pdf_file must be file-like with read()")
    doc = fitz.open(stream=raw, filetype="pdf")
    out = []
    for page in doc:
        # "blocks" or "text" extraction options exist. start with text
        page_text = page.get_text("text")
        out.append(page_text)
    text = "\n".join(out)
    return clean_extracted_text(text)
