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
2. **Role Manipulation (Jailbreak) Detection**: Blocks attempts to override the AI's system prompt (e.g., DAN mode, "you have no rules", "act as an unrestricted AI").
3. **Indirect Injection Defense**: Flags high-risk prompts containing external URLs mixed with trigger execution phrases ("summarize this link").
4. **Multilingual/Encoding Bypass**: Detects obfuscation attempts using non-Latin blocks mixed with translated override keywords to bypass standard English filters.
5. **Attention Blink/Noise**: Flags prompts with high densities of invisible zero-width characters (`\u200b`) or heavy special character noise meant to confuse the LLM parser.

*Note: While highly effective and extremely fast, this rule-based approach represents Phase 1 (Deliverable 2). Future iterations (Deliverable 3) research semantic LLM-as-a-Judge guardrails to catch creatively paraphrased zero-day injection attacks.*

---

## 📊 Security Operations Center (SOC) & Auditing

Accountability is just as critical as prevention. The Sandbox includes a **Tamper-Evident Audit Logger**:

- **Cryptographic Hash Chaining:** Every log entry calculates a SHA-256 hash incorporating the hash of the *previous* entry. Modifying any log instantly breaks the cryptographic chain.
- **Admin Dashboard:** A real-time SOC interface allows Administrators to view total traffic, block rates, Risk Scores, user prompts, and triggered security flags.
- **Verification Engine:** Admins can mathematically verify the unbroken integrity of the audit chain in one click.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.12+
- Node.js 18+ & npm
- A [Groq API Key](https://console.groq.com/) for LLM inference.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=gsk_your_api_key_here
SECRET_KEY=your_secure_random_jwt_secret
```
Run the FastAPI Server:
```bash
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (React)
The frontend is built using Vite and React, bundled and served securely by FastAPI.
```bash
cd frontend-react
npm install
npm run build
```
Once built, open your browser to `http://127.0.0.1:8000`. The frontend handles dynamic Markdown and KaTeX math rendering natively.

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
