from fastapi import APIRouter, HTTPException, Depends
from app.models.checkin import CheckinComment, CheckinCommentOut, CheckinSummaryRequest
from app.utils.auth import get_current_user, require_role
from app.utils.gemini import summarize_checkin_comments
from app.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/checkins", tags=["Check-ins"])


@router.post("/comment", response_model=dict)
async def add_checkin_comment(
    comment_data: CheckinComment,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    """Manager adds a structured check-in comment for a goal."""
    db = get_db()

    # Verify goal exists
    try:
        goal = await db.goals.find_one({"_id": ObjectId(comment_data.goal_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    doc = {
        "goal_id": comment_data.goal_id,
        "quarter": comment_data.quarter,
        "comment": comment_data.comment,
        "manager_id": str(current_user["_id"]),
        "manager_name": current_user["name"],
        "employee_id": goal["employee_id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.checkin_comments.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc["_id"] = result.inserted_id
    return {**doc, "id": str(result.inserted_id)}


@router.get("/goal/{goal_id}", response_model=List[dict])
async def get_goal_checkins(
    goal_id: str,
    quarter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all check-in comments for a goal."""
    db = get_db()
    query = {"goal_id": goal_id}
    if quarter:
        query["quarter"] = quarter

    comments = await db.checkin_comments.find(query).sort("created_at", -1).to_list(None)
    return [{**c, "id": str(c["_id"])} for c in comments]


@router.get("/employee/{employee_id}", response_model=List[dict])
async def get_employee_checkins(
    employee_id: str,
    cycle_id: str,
    quarter: Optional[str] = None,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    """Get all check-in comments for an employee in a cycle."""
    db = get_db()

    # Get all goals for this employee in the cycle
    goals = await db.goals.find({
        "employee_id": employee_id,
        "cycle_id": cycle_id
    }).to_list(None)
    goal_ids = [str(g["_id"]) for g in goals]

    query = {"goal_id": {"$in": goal_ids}}
    if quarter:
        query["quarter"] = quarter

    comments = await db.checkin_comments.find(query).sort("created_at", -1).to_list(None)
    return [{**c, "id": str(c["_id"])} for c in comments]


@router.post("/summarize")
async def summarize_comments(
    request: CheckinSummaryRequest,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    """Use AI to summarize check-in comments for an employee."""
    db = get_db()

    # Gather all comments for the specified goals and quarter
    comments = await db.checkin_comments.find({
        "goal_id": {"$in": request.goal_ids},
        "quarter": request.quarter
    }).to_list(None)

    comment_texts = [c["comment"] for c in comments]

    # Get employee name
    try:
        emp = await db.users.find_one({"_id": ObjectId(request.employee_id)})
        emp_name = emp["name"] if emp else "Employee"
    except Exception:
        emp_name = "Employee"

    summary = await summarize_checkin_comments(comment_texts, emp_name, request.quarter)
    return {"summary": summary, "comment_count": len(comment_texts)}


@router.get("/completion/{cycle_id}", response_model=dict)
async def get_checkin_completion(
    cycle_id: str,
    quarter: str,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    """Get check-in completion status for the team."""
    db = get_db()

    if current_user["role"] == "manager":
        team = await db.users.find({"manager_id": str(current_user["_id"])}).to_list(None)
    else:
        team = await db.users.find({"role": "employee"}).to_list(None)

    result = []
    for emp in team:
        emp_id = str(emp["_id"])
        goals = await db.goals.find({
            "employee_id": emp_id,
            "cycle_id": cycle_id,
            "status": "approved"
        }).to_list(None)

        total_goals = len(goals)
        updated_goals = sum(
            1 for g in goals
            if any(a["quarter"] == quarter for a in g.get("quarterly_achievements", []))
        )

        has_manager_comment = await db.checkin_comments.count_documents({
            "employee_id": emp_id,
            "quarter": quarter,
            "goal_id": {"$in": [str(g["_id"]) for g in goals]}
        }) > 0

        result.append({
            "employee_id": emp_id,
            "employee_name": emp["name"],
            "department": emp.get("department"),
            "total_goals": total_goals,
            "updated_goals": updated_goals,
            "completion_pct": round((updated_goals / total_goals * 100) if total_goals > 0 else 0, 1),
            "has_manager_comment": has_manager_comment,
            "status": "completed" if (updated_goals == total_goals and has_manager_comment and total_goals > 0)
                      else "in_progress" if updated_goals > 0
                      else "pending"
        })

    return {
        "quarter": quarter,
        "cycle_id": cycle_id,
        "employees": result,
        "overall_completion": round(
            sum(e["completion_pct"] for e in result) / len(result) if result else 0, 1
        )
    }
