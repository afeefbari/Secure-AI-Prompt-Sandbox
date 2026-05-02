"""
Risk Scorer — aggregates per-flag severity scores into a precise float 0.0–1.0.

Formula:
  final_score = min(1.0, max_flag_severity + 0.08 * (n_flags - 1))

Multi-flag bonus: Each additional triggered flag adds 0.08.
This reflects that multiple simultaneous attack signals = higher threat confidence.

Example scores:
  CRITICAL hit  alone (0.95)          → 0.95  → Blocked
  HIGH hit      alone (0.80)          → 0.80  → Blocked
  MEDIUM hit    alone (0.55)          → 0.55  → Flagged
  2× MEDIUM     (0.55 + 0.08)        → 0.63  → Flagged
  3× MEDIUM     (0.55 + 0.16)        → 0.71  → Blocked
  LOW           alone (0.30)          → 0.30  → Allowed
  HIGH + MEDIUM (0.80 + 0.08)        → 0.88  → Blocked
"""


def score(flags: list[str], severities: dict[str, float] | None = None) -> float:
    """
    Return a float risk score from 0.0 (clean) to 1.0 (certain attack).

    Args:
        flags: list of triggered flag names
        severities: dict mapping flag name → its detected severity (0.0–1.0)
    """
    if not flags:
        return 0.0

    if not severities:
        # Fallback: treat unknowns as MEDIUM (0.55)
        base = 0.55
        return min(1.0, base + 0.08 * (len(flags) - 1))

    per_flag_scores = [severities.get(f, 0.55) for f in flags]
    max_severity    = max(per_flag_scores)
    multi_bonus     = 0.08 * (len(flags) - 1)

    return round(min(1.0, max_severity + multi_bonus), 4)


def risk_label(score_val: float) -> str:
    """Human-readable tier label from a float score."""
    if score_val >= 0.70:
        return "High"
    if score_val >= 0.40:
        return "Medium"
    return "Low"
