import logging
from fastapi import APIRouter, Depends
from app.utils.auth import get_current_user
from app.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def serialize(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "user_id": n["user_id"],
        "type": n["type"],
        "title": n["title"],
        "message": n["message"],
        "is_read": n.get("is_read", False),
        "goal_id": n.get("goal_id"),
        "actor_name": n.get("actor_name"),
        "created_at": n["created_at"],
    }


@router.get("/", response_model=List[dict])
async def get_notifications(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Get latest notifications for the current user."""
    db = get_db()
    user_id = str(current_user["_id"])
    logger.debug(f"[Notifications] GET / user={user_id} limit={limit}")
    notifs = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(None)
    return [serialize(n) for n in notifs]


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Return the number of unread notifications for the current user."""
    db = get_db()
    user_id = str(current_user["_id"])
    logger.debug(f"[Notifications] GET /unread-count user={user_id}")
    count = await db.notifications.count_documents({
        "user_id": user_id,
        "is_read": False,
    })
    return {"count": count}


# ⚠️  IMPORTANT: /mark-all-read MUST be declared before /{notif_id}/read
# so FastAPI doesn't swallow it as a path parameter match.
@router.patch("/mark-all-read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark every unread notification as read for the current user."""
    db = get_db()
    user_id = str(current_user["_id"])
    logger.debug(f"[Notifications] PATCH /mark-all-read user={user_id}")
    result = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )
    return {"ok": True, "updated": result.modified_count}


@router.patch("/{notif_id}/read")
async def mark_read(
    notif_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    db = get_db()
    user_id = str(current_user["_id"])
    logger.debug(f"[Notifications] PATCH /{notif_id}/read user={user_id}")
    try:
        result = await db.notifications.update_one(
            {"_id": ObjectId(notif_id), "user_id": user_id},
            {"$set": {"is_read": True}},
        )
        return {"ok": True, "updated": result.modified_count}
    except Exception as exc:
        logger.warning(f"[Notifications] mark_read error: {exc}")
        return {"ok": False, "error": str(exc)}
