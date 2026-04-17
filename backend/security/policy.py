"""
Policy Engine — maps float risk score to a decision + reformulation tip.

Thresholds:
  < 0.40   → allowed   (Low risk — pass to LLM)
  0.40–0.69 → flagged  (Medium risk — pass to LLM with warning)
  ≥ 0.70   → blocked   (High risk — NO LLM call)
"""
from typing import Literal

Decision = Literal["allowed", "flagged", "blocked"]

# Per-attack-type reformulation tips
TIPS: dict[str, str] = {
    "sandwich_attack": (
        "Avoid phrases like 'ignore previous instructions', 'disregard the above', or "
        "'override your prompt'. Break your request into a single, clear question."
    ),
    "instruction_extraction": (
        "Attempting to retrieve the system's hidden instructions or configuration is not permitted. "
        "Ask your question directly."
    ),
    "role_manipulation": (
        "The system cannot adopt an unrestricted persona, remove its guidelines, or pretend to be "
        "a different AI. Ask your question without roleplay or jailbreak framing."
    ),
    "roleplay_escape": (
        "Using creative fiction or story framing to bypass content policies is detected. "
        "Rephrase your request without scenario-based or character-based framing."
    ),
    "privilege_escalation": (
        "Claiming admin, root, or developer access through a text prompt is not valid. "
        "Contact your system administrator through proper channels for elevated access."
    ),
    "indirect_injection": (
        "Sharing URLs or file paths for the AI to process is restricted — external content "
        "may contain malicious instructions. Paste the relevant text directly into your message."
    ),
    "multilingual_bypass": (
        "Mixed-language prompts containing instruction-override keywords are blocked. "
        "Rephrase in a single language without override terms."
    ),
    "attention_blink": (
        "Your prompt contains hidden characters, invisible formatting, or token-splitting patterns. "
        "Clear your input and type your question in plain text."
    ),
    "encoding_attack": (
        "Encoded or obfuscated content (base64, leetspeak, character substitution) was detected. "
        "Send your request as readable, unencoded plain text."
    ),
    "length_exceeded": (
        "Your prompt exceeds the maximum allowed length. "
        "Split your request into shorter, focused messages."
    ),
    "default": (
        "Your prompt was flagged by the security engine. "
        "Please rephrase it as a clear, direct question."
    ),
}


def decide(risk_score: float, flags: list[str]) -> tuple[Decision, str | None]:
    """
    Map a float risk score + flags to a (decision, tip) tuple.

    Returns:
        decision: "allowed" | "flagged" | "blocked"
        tip: reformulation guidance string (None when allowed)
    """
    if risk_score < 0.40:
        return "allowed", None

    # Pick the most specific tip we have for the first (highest-severity) flag
    tip = TIPS.get(flags[0], TIPS["default"]) if flags else TIPS["default"]

    if risk_score < 0.70:
        return "flagged", tip

    return "blocked", tip
