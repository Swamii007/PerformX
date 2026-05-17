from fastapi import APIRouter, HTTPException, Depends
from app.models.user import LoginRequest, Token, UserOut
from app.utils.auth import verify_password, create_access_token, get_current_user
from app.database import get_db
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


def serialize_user(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        manager_id=user.get("manager_id"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at", datetime.utcnow()),
    )


@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": request.email.lower()})
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return Token(access_token=token, user=serialize_user(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)


@router.post("/logout")
async def logout():
    # JWT is stateless; client should discard the token
    return {"message": "Logged out successfully"}
