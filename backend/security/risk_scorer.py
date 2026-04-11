"""
Risk Scorer — aggregates validator flags into Low / Medium / High.
Policy:
  0 flags → Low
  1 flag  → Medium
  2+ flags → High
"""
from typing import Literal


RiskLevel = Literal["Low", "Medium", "High"]


def score(flags: list[str]) -> RiskLevel:
    """Return risk level based on number of triggered flags."""
    count = len(flags)
    if count == 0:
        return "Low"
    elif count == 1:
        return "Medium"
    else:
        return "High"
