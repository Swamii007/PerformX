from fastapi import APIRouter, HTTPException, Depends
from app.models.cycle import CycleCreate, CycleUpdate, CyclePhase
from app.utils.auth import require_role, get_current_user
from app.database import get_db
from datetime import datetime
from typing import List

router = APIRouter(prefix="/cycles", tags=["Cycles"])


def serialize_cycle(c: dict) -> dict:
    return {
        "id": c["id"],
        "name": c["name"],
        "current_phase": c["current_phase"],
        "goal_setting_start": c["goal_setting_start"],
        "goal_setting_end": c["goal_setting_end"],
        "q1_start": c["q1_start"],
        "q1_end": c["q1_end"],
        "q2_start": c["q2_start"],
        "q2_end": c["q2_end"],
        "q3_start": c["q3_start"],
        "q3_end": c["q3_end"],
        "q4_start": c["q4_start"],
        "q4_end": c["q4_end"],
        "is_active": c.get("is_active", True),
        "created_at": c.get("created_at"),
    }


@router.post("/", response_model=dict)
async def create_cycle(
    data: CycleCreate,
    current_user: dict = Depends(require_role("admin"))
):
    db = get_db()
    existing = await db.cycles.find_one({"id": data.id})
    if existing:
        raise HTTPException(status_code=400, detail="Cycle ID already exists")

    doc = {
        **data.model_dump(),
        "current_phase": CyclePhase.GOAL_SETTING,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.cycles.insert_one(doc)
    return serialize_cycle(doc)


@router.get("/", response_model=List[dict])
async def list_cycles(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cycles = await db.cycles.find().sort("created_at", -1).to_list(None)
    return [serialize_cycle(c) for c in cycles]


@router.get("/active", response_model=dict)
async def get_active_cycle(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cycle = await db.cycles.find_one({"is_active": True})
    if not cycle:
        raise HTTPException(status_code=404, detail="No active cycle found")
    return serialize_cycle(cycle)


@router.patch("/{cycle_id}", response_model=dict)
async def update_cycle(
    cycle_id: str,
    update_data: CycleUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    db = get_db()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    result = await db.cycles.update_one({"id": cycle_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cycle not found")
    cycle = await db.cycles.find_one({"id": cycle_id})
    return serialize_cycle(cycle)
