"""
Policy Engine — maps risk score to a decision and reformulation tip.
Decision:
  Low    → "allowed"
  Medium → "flagged"  (LLM call proceeds with warning)
  High   → "blocked"  (NO LLM call)
"""
from typing import Literal

Decision = Literal["allowed", "flagged", "blocked"]

# Reformulation tips per attack type
TIPS: dict[str, str] = {
    "sandwich_attack": (
        "Avoid phrases like 'ignore previous instructions' or 'disregard the above'. "
        "Break your request into a single clear question."
    ),
    "role_manipulation": (
        "The system cannot change its identity or remove its guidelines. "
        "Ask your question directly without roleplaying or jailbreak framing."
    ),
    "indirect_injection": (
        "Sharing URLs for the AI to process is restricted. "
        "Paste the relevant text directly into your prompt instead."
    ),
    "multilingual_bypass": (
        "Mixed-language prompts containing override terms are blocked. "
        "Rephrase your query in a single language without instruction-override keywords."
    ),
    "attention_blink": (
        "Your prompt contains hidden characters or unusual formatting. "
        "Clear your input and type your question plainly."
    ),
    "length_exceeded": (
        f"Your prompt is too long. Keep it under 2000 characters."
    ),
    "default": (
        "Your prompt was flagged by our security engine. "
        "Please rephrase it as a clear, direct question."
    ),
}


def decide(risk_score: str, flags: list[str]) -> tuple[Decision, str | None]:
    """
    Returns (decision, reformulation_tip).
    Tip is None when allowed, relevant tip string when flagged/blocked.
    """
    if risk_score == "Low":
        return "allowed", None

    # Pick the most relevant tip based on first flag
    tip = TIPS.get(flags[0], TIPS["default"]) if flags else TIPS["default"]

    if risk_score == "Medium":
        return "flagged", tip

    # High → blocked
    return "blocked", tip
