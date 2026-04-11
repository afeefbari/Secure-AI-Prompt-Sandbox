"""
SHA-256 Hash-Chained Audit Logger (SR-08).
Every log entry includes the SHA-256 hash of the previous entry.
Any modification to any entry breaks the chain — detectable via /admin/verify-chain.
"""
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from threading import Lock

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)
LOG_FILE = os.path.join(DATA_DIR, "audit_log.jsonl")

_lock = Lock()  # Thread-safe file writes
GENESIS_HASH = "0" * 64  # Hash of the first entry's "previous"


def _get_last_hash() -> str:
    """Read the last entry's current_hash, or GENESIS_HASH if log is empty."""
    try:
        with open(LOG_FILE, "rb") as f:
            # Read last non-empty line efficiently
            lines = [l for l in f.read().split(b"\n") if l.strip()]
            if not lines:
                return GENESIS_HASH
            last = json.loads(lines[-1])
            return last.get("current_hash", GENESIS_HASH)
    except FileNotFoundError:
        return GENESIS_HASH


def _compute_hash(prev_hash: str, entry_data: dict) -> str:
    """SHA-256 of prev_hash concatenated with deterministic JSON of entry."""
    raw = prev_hash + json.dumps(entry_data, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def log_event(
    user_id: str,
    prompt_hash: str,
    decision: str,
    risk_score: str,
    flags: list[str],
) -> dict:
    """Append a tamper-evident audit entry. Returns the written entry."""
    with _lock:
        prev_hash = _get_last_hash()
        entry_data = {
            "entry_id": str(uuid.uuid4()),
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "prompt_hash": prompt_hash,
            "decision": decision,
            "risk_score": risk_score,
            "flags": flags,
            "prev_hash": prev_hash,
        }
        current_hash = _compute_hash(prev_hash, entry_data)
        entry_data["current_hash"] = current_hash

        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry_data) + "\n")

    return entry_data


def get_all_logs() -> list[dict]:
    """Return all audit log entries."""
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]
    except FileNotFoundError:
        return []


def verify_chain() -> dict:
    """
    Verify the SHA-256 chain integrity across all entries.
    Returns { valid: bool, broken_at: entry_id | None, total: int }
    """
    entries = get_all_logs()
    if not entries:
        return {"valid": True, "broken_at": None, "total": 0}

    prev_hash = GENESIS_HASH
    for entry in entries:
        stored_current = entry.pop("current_hash")
        expected = _compute_hash(prev_hash, entry)
        entry["current_hash"] = stored_current  # Restore

        if expected != stored_current:
            return {
                "valid": False,
                "broken_at": entry.get("entry_id"),
                "total": len(entries),
            }
        prev_hash = stored_current

    return {"valid": True, "broken_at": None, "total": len(entries)}
