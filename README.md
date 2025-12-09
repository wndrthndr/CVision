<<<<<<< HEAD
# Resonance — AI Resume Analyzer (Noir Editorial)

This is a ready-to-run project (Next.js frontend + Express backend) with a noir editorial UI.

## Setup

1. Install frontend deps
   cd client
   npm install

2. Install backend deps
   cd ../server
   npm install

3. Copy env
   cp .env.example .env
   # add your GENERATIVE_AI_API_KEY in server/.env

4. Run locally
   # server
   cd server && npm run dev
   # client
   cd ../client && npm run dev

Open http://localhost:3000

Notes:
- The server calls an OpenAI-compatible endpoint by default. Set OPENAI_COMPAT_URL if needed.
- No signup required — users upload resumes and click Analyze.
=======
# CVision
>>>>>>> f0ecebc44ac8cf35f1cd8cf88cc28a969e5aab04
