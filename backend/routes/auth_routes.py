"""
Auth routes: /auth/register and /auth/login
"""
import hashlib
from fastapi import APIRouter, HTTPException, Request, status
from passlib.context import CryptContext
from auth.jwt_handler import create_access_token
from database import get_user, create_user
from models.schemas import UserRegister, UserLogin, Token
from limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, body: UserRegister):
    if get_user(body.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )
    hashed = pwd_ctx.hash(body.password)
    create_user(body.username, hashed, body.role)
    return {"message": "User registered successfully"}


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, body: UserLogin):
    user = get_user(body.username)
    if not user or not pwd_ctx.verify(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}
