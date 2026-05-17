from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserCreate, UserOut, UserUpdate
from app.utils.auth import hash_password, get_current_user, require_role
from app.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/users", tags=["Users"])


def serialize_user(user: dict, manager_name: str = None) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "department": user.get("department"),
        "manager_id": user.get("manager_id"),
        "manager_name": manager_name,
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at", datetime.utcnow()),
    }


@router.post("/", response_model=dict)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_role("admin"))
):
    db = get_db()
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.utcnow()
    doc = {
        "email": user_data.email.lower(),
        "name": user_data.name,
        "role": user_data.role,
        "department": user_data.department,
        "manager_id": user_data.manager_id,
        "hashed_password": hash_password(user_data.password),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


@router.get("/", response_model=List[dict])
async def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    db = get_db()
    query = {}
    if role:
        query["role"] = role
    if department:
        query["department"] = department

    # Managers can only see their own team
    if current_user["role"] == "manager":
        query["manager_id"] = str(current_user["_id"])

    users = await db.users.find(query).to_list(None)
    result = []
    for u in users:
        manager_name = None
        if u.get("manager_id"):
            try:
                mgr = await db.users.find_one({"_id": ObjectId(u["manager_id"])})
                if mgr:
                    manager_name = mgr["name"]
            except Exception:
                pass
        result.append(serialize_user(u, manager_name))
    return result


@router.get("/team", response_model=List[dict])
async def get_my_team(current_user: dict = Depends(require_role("manager", "admin"))):
    """Get all employees reporting to the current manager."""
    db = get_db()
    employees = await db.users.find({
        "manager_id": str(current_user["_id"]),
        "role": "employee"
    }).to_list(None)
    return [serialize_user(e) for e in employees]


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Employees can only view their own profile
    if current_user["role"] == "employee" and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    manager_name = None
    if user.get("manager_id"):
        try:
            mgr = await db.users.find_one({"_id": ObjectId(user["manager_id"])})
            if mgr:
                manager_name = mgr["name"]
        except Exception:
            pass

    return serialize_user(user, manager_name)


@router.patch("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()

    result = await db.users.update_one({"_id": oid}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one({"_id": oid})
    return serialize_user(user)
