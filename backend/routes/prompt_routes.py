"""
Prompt submission route — the full security pipeline.

Flow:
1. JWT auth (require_user)
2. Rate limit (20/min)
3. Length gate
4. Validator (5 attack patterns)
5. Risk scorer
6. Policy engine (Allow / Flag / Block)
7. Audit log (hash-chained)
8. If blocked: return decision + tip (NO LLM call)
9. If flagged/allowed: Groq LLM call → return response
"""
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request, status
from auth.rbac import require_user
from security.validator import validate_prompt, MAX_PROMPT_LENGTH
from security.risk_scorer import score
from security.policy import decide
from security.context import get_or_create_session, append_to_history
from audit.logger import log_event
from llm.connector import query_llm
from models.schemas import PromptRequest, PromptResponse
from limiter import limiter

router = APIRouter(tags=["prompt"])


@router.post("/submit-prompt", response_model=PromptResponse)
@limiter.limit("20/minute")
async def submit_prompt(
    request: Request,
    body: PromptRequest,
    current_user: dict = Depends(require_user),
):
    prompt = body.prompt.strip()

    # ── Length gate ────────────────────────────────────────────────────────────
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prompt exceeds maximum length of {MAX_PROMPT_LENGTH} characters.",
        )

    # ── Validate ───────────────────────────────────────────────────────────────
    validation = validate_prompt(prompt)
    risk_score = score(validation.flags, validation.severities)
    decision, tip = decide(risk_score, validation.flags)
    reason = " | ".join(validation.reasons) if validation.reasons else "No threats detected."

    # ── Audit log ──────────────────────────────────────────────────────────────
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
    log_event(
        user_id=current_user["username"],
        prompt_hash=prompt_hash,
        decision=decision,
        risk_score=str(risk_score),   # Store float as string e.g. "0.85"
        flags=validation.flags,
        prompt_preview=prompt,
    )

    # ── Block: no LLM call ─────────────────────────────────────────────────────
    if decision == "blocked":
        return PromptResponse(
            decision="blocked",
            risk_score=risk_score,
            flags=validation.flags,
            reason=reason,
            llm_response=None,
            reformulation_tip=tip,
        )

    # ── Allowed / Flagged: call LLM ────────────────────────────────────────────
    session_id, session = get_or_create_session(body.session_id)
    try:
        llm_response = query_llm(prompt, history=session.get("history", []))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM service error: {str(e)}",
        )

    # Update conversation history
    append_to_history(session_id, "user", prompt)
    append_to_history(session_id, "assistant", llm_response)

    return PromptResponse(
        decision=decision,
        risk_score=risk_score,
        flags=validation.flags,
        reason=reason,
        llm_response=llm_response,
        reformulation_tip=tip,
    )
