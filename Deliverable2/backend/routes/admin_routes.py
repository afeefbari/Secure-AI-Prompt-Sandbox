"""
Admin routes — protected by require_admin.
GET /admin/logs        → all audit log entries
GET /admin/verify-chain → SHA-256 chain integrity check
"""
from fastapi import APIRouter, Depends
from auth.rbac import require_admin
from audit.logger import get_all_logs, verify_chain

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/logs")
async def get_logs(current_user: dict = Depends(require_admin)):
    """Return all audit log entries. Admin only."""
    return {"logs": get_all_logs()}


@router.get("/verify-chain")
async def check_chain(current_user: dict = Depends(require_admin)):
    """Verify SHA-256 hash chain integrity across entire audit log. Admin only."""
    result = verify_chain()
    return result
