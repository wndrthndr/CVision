# utils/gemini_service.py
import os
import json

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Example using pseudo-client - replace with your SDK
from google.genai import Client

client = Client(api_key=GEMINI_KEY)


def prompt_for_resume_parsing():
    return """
You are a reliable resume parser. Output a JSON object with these fields:
{
  "contact": {"name": "", "email": "", "phone": ""},
  "summary": "short summary",
  "skills": ["list", "of", "skills"],
  "experience": [
    {"title":"", "company":"", "start":"YYYY", "end":"YYYY|Present", "bullets":["..."], "years":1.5}
  ],
  "education": [{"degree":"", "school":"", "start":"YYYY", "end":"YYYY"}],
  "projects": [{"title":"", "desc":""}],
  "raw_text": "original text"
}
Only return valid JSON.
"""

def parse_pdf_with_gemini(pdf_bytes: bytes):
    prompt = prompt_for_resume_parsing()
    # contents: prompt + file
    response = client.models.generate_content(
        model=MODEL,
        contents=[
            prompt,
            {"mime_type":"application/pdf", "data": pdf_bytes}
        ],
        temperature=0.0,
        max_output_tokens=1500
    )
    # response parsing depends on SDK; assume .text or .outputs
    text = response.text if hasattr(response, "text") else str(response)
    # Try to extract JSON
    try:
        # find first { ... } block
        start = text.find("{")
        end = text.rfind("}")
        json_text = text[start:end+1]
        parsed = json.loads(json_text)
        return parsed
    except Exception as e:
        raise RuntimeError("Failed to parse Gemini response JSON: " + str(e))
