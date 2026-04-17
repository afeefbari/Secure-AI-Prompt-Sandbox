# 🛡️ Secure AI Prompt Sandbox

![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Groq](https://img.shields.io/badge/Powered%20by-Groq_Llama_3-f59e0b?style=for-the-badge)

> A security middleware layer sitting between users and Large Language Model (LLM) APIs — enforcing prompt validation, injection detection, context isolation, and tamper-evident audit logging.

---

## 📌 Overview

**Secure AI Prompt Sandbox** is a robust security gateway designed to intercept, validate, and sanitize all prompt traffic before it hits production LLMs. 

As LLMs integrate into production systems, they introduce vulnerabilities like **Prompt Injection**, **Jailbreaking**, and **Data Exfiltration**. This project solves these threats at the middleware level, blocking malicious prompts in under 10ms while logging every interaction cryptographically.

---

## 🛡️ The 5-Layer Validation Engine

The sandbox employs a sequential, rule-based security pipeline that inspects every prompt before LLM routing:

1. **Sandwich Attack Detection**: Detects prompts encapsulating malicious requests wrapped in "ignore previous instructions" framing.
2. **Role Manipulation (Jailbreak) Detection**: Blocks attempts to override the AI's system prompt (e.g., DAN mode, "you have no rules", "act as an unrestricted AI"). Also includes advanced fictional roleplay escapes and privilege escalation.
3. **Indirect Injection Defense**: Flags high-risk prompts containing external URLs or filesystem paths mixed with trigger execution phrases ("summarize this link").
4. **Multilingual Bypass**: Detects obfuscation attempts using non-Latin blocks mixed with translated override keywords to bypass standard English filters.
5. **Attention Blink & Obfuscation**: Flags prompts with high densities of invisible zero-width characters, spaced tokens, base64 payloads, or leetspeak encoding.

### 🧮 Precision Risk Scoring
Rather than a naive pass/fail count, the pipeline uses a layered **Mathematical Severity Scorer**:
- **CRITICAL (0.95)**: Absolute blockers like explicit Jailbreaks.
- **HIGH (0.80)**: Strong attack signals like Base64 obfuscation.
- **MEDIUM (0.55)**: Flags for suspicious hypothetical phrasing.
- **Multi-Flag Bonus**: Triggers a geometric risk multiplier if multiple attack vectors are hit simultaneously (e.g., Leetspeak + Sandwich attack = High Risk Block).

*Note: While highly effective and extremely fast, this rule-based approach represents Phase 1 (Deliverable 2). Future iterations (Deliverable 3) reserve scope for semantic LLM-as-a-Judge guardrails to catch creatively paraphrased zero-day injection attacks.*

---

## 📊 Security Operations Center (SOC) & Auditing

Accountability is just as critical as prevention. The Sandbox includes a **Tamper-Evident Audit Logger**:

- **Cryptographic Hash Chaining:** Every log entry calculates a SHA-256 hash incorporating the hash of the *previous* entry. Modifying any log instantly breaks the cryptographic chain.
- **Admin Dashboard:** A real-time SOC interface allows Administrators to view total traffic, block rates, Risk Scores, user prompts, and triggered security flags.
- **Verification Engine:** Admins can mathematically verify the unbroken integrity of the audit chain in one click.

---

## 🚀 Detailed Installation & Setup

This application uses a unified server architecture where the FastAPI backend securely serves the optimized React frontend.

### 1. System Requirements
- **Python**: Version 3.12 or newer.
- **Node.js**: Version 18 or newer (with `npm`).
- **Groq API Key**: Essential for LLM inference. Get one free at [console.groq.com](https://console.groq.com/).

### 2. Clone the Repository
```bash
git clone https://github.com/afeefbari/Secure-AI-Prompt-Sandbox.git
cd Secure-AI-Prompt-Sandbox
```

### 3. Frontend Build Pipeline (React + Vite)
You must build the frontend first. The resulting static assets are piped directly into the FastAPI `static/` directory to bypass CORS complexities and enforce same-origin security.

```bash
# Navigate to the React workspace
cd frontend-react

# Install Node dependencies
npm install

# Build the production bundle
npm run build
```
*Note: Vite will compile the React SPA and automatically deposit the `index.html` and assets into the `../backend/frontend` folder.*

### 4. Backend Environment Setup (FastAPI)
Return to the project root and enter the backend directory.

```bash
# Navigate to backend
cd ../backend

# Provide a clean virtual environment
python -m venv venv

# Activate the virtual environment
# --> For Windows Command Prompt:
venv\Scripts\activate.bat
# --> For Windows PowerShell:
.\venv\Scripts\Activate.ps1
# --> For Linux/macOS:
source venv/bin/activate

# Install required Python dependencies
pip install -r requirements.txt
```

### 5. Environment Variables Formatted (.env)
Create a `.env` file directly inside the `backend/` directory. You will need a strong secret key for JWT session integrity. 
You can generate a fast secret key by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal.

```env
# backend/.env 
GROQ_API_KEY=gsk_your_groq_api_key_here
SECRET_KEY=94b7e8d380e227... (insert your 64-character hex key)
```

### 6. Boot the Server
Start the Uvicorn ASGI server with hot-reloading (ideal for testing).

```bash
python -m uvicorn main:app --reload --port 8000
```

### 7. Accessing the Sandbox
1. Open your web browser and navigate to: **`http://127.0.0.1:8000`**
2. Register a new user account (or log in).
3. Start texting the Assistant. 
4. **Admin Access:** If you wish to view the SOC Dashboard, you must manually change your user role to `admin` in the SQLite `sandbox.db` file, or register with the exact username "admin" (if allowed by your local router).

---

## 👥 Team

| Name | Student ID |
|---|---|
| Muhammad Afeef Bari | 2023356 |
| Mahad Aqeel | 2023286 |
| Muhammad Daniyal | 2023406 |

**Course:** CY321 — Secure Software Development  
**Supervisor:** Dr. Zubair Ahmad

---

## 📅 Deliverables

| Deliverable | Deadline | Status |
|---|---|---|
| D-1: Threat Model & Security Requirements | 08 Mar 2026 | ✅ Complete |
| D-2: Initial Implementation | 19 Apr 2026 | ✅ Complete |
| D-3: Security Testing & Final Demo | 05 May 2026 | ⏳ Pending |

---

> *This project is developed as part of the CY321 Secure Software Development course at GIKI.*
