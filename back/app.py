# flask-backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import pdfplumber
import os
import google.generativeai as genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import json
import re # Import regex module

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return jsonify({"message": "Flask + Gemini API running"})

@app.route('/analyze-job', methods=['POST'])
def analyze_job_resume():
    job_description = request.form.get('job_description', '')

    if not job_description:
        return jsonify({"error": "Job description is required."}), 400

    if 'resume_file' not in request.files:
        return jsonify({"error": "No resume file part in the request"}), 400
    
    file = request.files['resume_file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filepath = None
    try:
        if not (file and allowed_file(file.filename)):
            return jsonify({"error": "Allowed file types are pdf"}), 400
            
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        with pdfplumber.open(filepath) as pdf:
            resume_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        resume_words = resume_text.split()
        resume_word_count = len(resume_words)

        print("Extracted Resume Text (first 500 chars):", resume_text[:500])
        print("Resume Word Count:", resume_word_count)
        print("Received Job Description (first 500 chars):", job_description[:500])

        model = genai.GenerativeModel('gemini-1.5-flash')
        chat = model.start_chat(history=[])

        # --- REFINED PROMPT FOR STRICT JSON OUTPUT ---
        # Emphasize ONLY JSON output
        prompt_content = f"""
        You are an expert resume analyzer for job applications.
        Analyze the provided resume against the given job description.
        **Respond ONLY with a JSON object.** DO NOT include any conversational text, explanations, or markdown fences (```json).

        ---
        Job Description:
        {job_description}

        ---
        Resume:
        {resume_text}

        ---
        Your JSON object MUST have the following keys and data types:
        - "overall_match_score": integer (0-100)
        - "key_strengths": list of 3 to 5 strings (bullet points)
        - "areas_for_improvement": list of 2 to 3 strings (bullet points)
        - "actionable_feedback": string (1-2 sentences)
        - "extracted_key_skills": list of 5 to 10 strings

        Example of the REQUIRED JSON format:
        {{
          "overall_match_score": 85,
          "key_strengths": [
            "Strong experience in Python and data analysis aligned with requirements.",
            "Demonstrated success in project management.",
            "Excellent communication skills."
          ],
          "areas_for_improvement": [
            "Lack of direct experience with specific tool X mentioned in the job description.",
            "Could elaborate more on quantifiable achievements in previous roles."
          ],
          "actionable_feedback": "Consider adding a summary that directly ties your past achievements to the requirements of this role.",
          "extracted_key_skills": ["Python", "Data Analysis", "Project Management", "SQL", "Machine Learning"]
          
        }}
        """
        response = chat.send_message(prompt_content)
        gemini_raw_output = response.text
        print("Gemini Raw Output (before extraction):", gemini_raw_output)

        gemini_analysis_str = gemini_raw_output

        # --- ROBUST JSON EXTRACTION LOGIC ---
        # This regex looks for a JSON object possibly wrapped in markdown code blocks
        # and also handles cases where it's not wrapped.
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', gemini_raw_output, re.DOTALL)
        if json_match:
            gemini_analysis_str = json_match.group(1)
            print("Extracted JSON (from markdown block):", gemini_analysis_str)
        else:
            # Fallback if no markdown block, assume raw output is JSON
            print("No markdown JSON block found, attempting to parse raw output.")

        try:
            # Attempt to parse the extracted (or raw) string as JSON
            gemini_analysis = json.loads(gemini_analysis_str)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Problematic JSON string: {gemini_analysis_str}")
            # If still fails, return the error and problematic string for debugging
            return jsonify({
                "error": "AI analysis returned invalid JSON. Check console for details.",
                "raw_gemini_output": gemini_raw_output # Send original raw output for debugging
            }), 500
        # --- END ROBUST JSON EXTRACTION LOGIC ---

        return jsonify({
            "resume_extracted_text": resume_text,
            "resume_word_count": resume_word_count,
            "job_description_received": job_description,
            "gemini_analysis": gemini_analysis
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to process file or call Gemini API: {str(e)}"}), 500
    finally:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)

if __name__ == '__main__':
    app.run(debug=True, port=5000)