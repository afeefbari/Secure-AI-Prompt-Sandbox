from pydantic import BaseModel
from typing import Optional, Literal


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    password: str
    role: Literal["user", "admin"] = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: Optional[str] = None
    role: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ── Prompt ────────────────────────────────────────────────────────────────────

class PromptRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None


class ValidationResult(BaseModel):
    risk_score: Literal["Low", "Medium", "High"]
    flags: list[str]
    reason: str


class PromptResponse(BaseModel):
    decision: Literal["allowed", "flagged", "blocked"]
    risk_score: Literal["Low", "Medium", "High"]
    flags: list[str]
    reason: str
    llm_response: Optional[str] = None
    reformulation_tip: Optional[str] = None


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    entry_id: str
    user_id: str
    timestamp: str
    prompt_hash: str
    decision: str
    risk_score: str
    flags: list[str]
    current_hash: str
    prev_hash: str
