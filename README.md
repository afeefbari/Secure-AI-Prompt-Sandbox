# 🛡️ Secure AI Prompt Sandbox

> A security middleware layer between users and LLM APIs — enforcing prompt validation, injection detection, context isolation, and tamper-evident audit logging.

---

## 📌 Overview

**Secure AI Prompt Sandbox** is a web-based security gateway designed to sit between end users and Large Language Model (LLM) APIs. It intercepts all prompt traffic, applies policy enforcement, detects adversarial inputs, and maintains a cryptographically secure audit trail of every interaction.

The project addresses a growing real-world problem: as LLMs are integrated into production systems, they become attack surfaces. Prompt injection, context leakage, unauthorized API access, and missing audit trails are all live threats in deployed LLM systems. This project tackles them at the middleware level.

---

## 🎯 Core Objectives

- Validate and sanitize all prompts before they reach the LLM
- Detect and block prompt injection and jailbreak attempts
- Enforce Role-Based Access Control (RBAC) on all API interactions
- Isolate user context to prevent cross-session data leakage
- Log all interactions in a tamper-evident, hash-chained audit trail
- Secure API key management using vault-based credential storage

---

## 🏗️ System Architecture

The system is composed of the following core components:

| Component | Role |
|---|---|
| **User Interface** | Browser-based client for interacting with the sandbox |
| **WebView** | Renders and mediates web content securely |
| **API Gateway** | Entry point — handles authentication (JWT) and RBAC |
| **Security Engine** | Prompt validation, injection detection, risk scoring |
| **Audit Module** | SHA-256 hash-chained tamper-evident logging |
| **LLM Connector** | Forwards approved prompts to the LLM provider |
| **API Key Vault** | AES-256-GCM encrypted credential storage |
| **LLM Provider (Groq)** | External LLM API (Groq) |

---

## 🔐 Security Model

Threat modeling was performed using **IriusRisk** following the **STRIDE** methodology.

- **38 threats** identified and accepted across all components
- **57 countermeasures** defined and mapped
- Risk areas covered: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege

---

## 👥 Team

| Name | Student ID |
|---|---|
| Muhammad Afeef Bari | 2023356 |
| Mahad Aqeel | 2023286 |
| Muhammad Daniyal | 2023406 |

**Course:** CY321 — Secure Software Development  
**Supervisor:** Dr Zubair Ahmad

---

## 📅 Deliverables

| Deliverable | Deadline | Status |
|---|---|---|
| D-1: Threat Model & Security Requirements | 08 Mar 2026 | ✅ Complete |
| D-2: Initial Implementation | 19 Apr 2026 | 🔄 In Progress |
| D-3: Security Testing & Final Demo | 05 May 2026 | ⏳ Pending |

---

## 📁 Repository Structure

```
Secure-AI-Prompt-Sandbox/
├── Deliverable-1/       # Threat model, security requirements, architecture
├── Deliverable-2/       # Source code (initial implementation)
├── Deliverable-3/       # Final source, test results, demo
├── frontend/            # Frontend application
├── backend/             # Backend services
├── docs/                # Documentation and reports
└── README.md
```

---

> *This project is developed as part of the CY321 Secure Software Development course.*
