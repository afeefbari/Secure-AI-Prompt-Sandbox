"""
RBAC middleware — FastAPI dependencies.
require_user: any authenticated user
require_admin: must have role == "admin"
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.jwt_handler import verify_token

bearer_scheme = HTTPBearer()


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validates JWT and returns payload. Raises 401 on failure."""
    return verify_token(credentials.credentials)


def require_admin(
    current_user: dict = Depends(require_user),
) -> dict:
    """Extends require_user — additionally checks for admin role. Raises 403 if not admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
