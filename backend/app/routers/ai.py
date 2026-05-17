from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.utils.auth import get_current_user
from app.utils.gemini import suggest_goals
from app.database import get_db

router = APIRouter(prefix="/ai", tags=["AI Features"])


class GoalSuggestionRequest(BaseModel):
    thrust_area: str
    cycle_id: str
    existing_titles: Optional[List[str]] = []


@router.post("/suggest-goals")
async def get_goal_suggestions(
    request: GoalSuggestionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered smart goal suggestions based on thrust area."""
    db = get_db()

    # Get existing goal titles to avoid duplicates
    existing = await db.goals.find({
        "employee_id": str(current_user["_id"]),
        "cycle_id": request.cycle_id
    }).to_list(None)
    existing_titles = [g["title"] for g in existing] + (request.existing_titles or [])

    suggestions = await suggest_goals(
        thrust_area=request.thrust_area,
        department=current_user.get("department", "General"),
        role=current_user.get("role", "employee"),
        existing_titles=existing_titles
    )

    return {"suggestions": suggestions, "thrust_area": request.thrust_area}
