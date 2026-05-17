import logging

from fastapi import APIRouter, Depends, Query
from app.utils.auth import require_role
from app.utils.gemini import generate_analytics_insight
from app.utils.progress import compute_overall_score
from app.database import get_db
from bson import ObjectId
from typing import Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview/{cycle_id}")
async def get_overview(
    cycle_id: str,
    department: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    """High-level analytics overview for a cycle."""
    db = get_db()

    # Build employee filter
    emp_query = {"role": "employee"}
    if department:
        emp_query["department"] = department
    if current_user["role"] == "manager":
        emp_query["manager_id"] = str(current_user["_id"])

    employees = await db.users.find(emp_query).to_list(None)
    emp_ids = [str(e["_id"]) for e in employees]

    # Goal stats
    all_goals = await db.goals.find({
        "employee_id": {"$in": emp_ids},
        "cycle_id": cycle_id
    }).to_list(None)

    total_goals = len(all_goals)
    submitted = sum(1 for g in all_goals if g["status"] in ["submitted", "approved"])
    approved = sum(1 for g in all_goals if g["status"] == "approved")
    draft = sum(1 for g in all_goals if g["status"] == "draft")
    returned = sum(1 for g in all_goals if g["status"] == "returned")

    # Thrust area breakdown
    thrust_breakdown = defaultdict(int)
    for g in all_goals:
        thrust_breakdown[g["thrust_area"]] += 1

    # UoM breakdown
    uom_breakdown = defaultdict(int)
    for g in all_goals:
        uom_breakdown[g["uom_type"]] += 1

    # Progress status breakdown (approved goals only)
    progress_breakdown = defaultdict(int)
    for g in all_goals:
        if g["status"] == "approved":
            progress_breakdown[g.get("progress_status", "not_started")] += 1

    # Average progress score
    scores = []
    for g in all_goals:
        if g["status"] == "approved":
            for ach in g.get("quarterly_achievements", []):
                if ach.get("progress_score") is not None:
                    scores.append(ach["progress_score"])
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Employees who submitted goals
    emp_submitted = len(set(g["employee_id"] for g in all_goals if g["status"] != "draft"))
    submission_rate = round(emp_submitted / len(emp_ids) * 100, 1) if emp_ids else 0

    return {
        "cycle_id": cycle_id,
        "total_employees": len(emp_ids),
        "employees_submitted": emp_submitted,
        "submission_rate": submission_rate,
        "total_goals": total_goals,
        "goals_draft": draft,
        "goals_submitted": submitted,
        "goals_approved": approved,
        "goals_returned": returned,
        "approval_rate": round(approved / submitted * 100, 1) if submitted > 0 else 0,
        "avg_progress_score": avg_score,
        "thrust_area_breakdown": dict(thrust_breakdown),
        "uom_breakdown": dict(uom_breakdown),
        "progress_breakdown": dict(progress_breakdown),
    }


@router.get("/team-performance/{cycle_id}")
async def get_team_performance(
    cycle_id: str,
    quarter: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    """Per-employee performance scores for the team."""
    db = get_db()

    emp_query = {"role": "employee"}
    if current_user["role"] == "manager":
        emp_query["manager_id"] = str(current_user["_id"])

    employees = await db.users.find(emp_query).to_list(None)
    result = []

    for emp in employees:
        emp_id = str(emp["_id"])
        goals = await db.goals.find({
            "employee_id": emp_id,
            "cycle_id": cycle_id,
            "status": "approved"
        }).to_list(None)

        overall_score = compute_overall_score(goals)

        # Quarter-specific score
        quarter_score = None
        if quarter:
            q_scores = []
            for g in goals:
                for ach in g.get("quarterly_achievements", []):
                    if ach["quarter"] == quarter and ach.get("progress_score") is not None:
                        q_scores.append(ach["progress_score"] * g["weightage"] / 100)
            quarter_score = round(sum(q_scores), 1) if q_scores else None

        result.append({
            "employee_id": emp_id,
            "employee_name": emp["name"],
            "department": emp.get("department"),
            "total_goals": len(goals),
            "overall_score": overall_score,
            "quarter_score": quarter_score,
            "goals_completed": sum(1 for g in goals if g.get("progress_status") == "completed"),
            "goals_on_track": sum(1 for g in goals if g.get("progress_status") == "on_track"),
            "goals_not_started": sum(1 for g in goals if g.get("progress_status") == "not_started"),
        })

    return {"cycle_id": cycle_id, "quarter": quarter, "employees": result}


@router.get("/department-heatmap/{cycle_id}")
async def get_department_heatmap(
    cycle_id: str,
    current_user: dict = Depends(require_role("admin"))
):
    """Department-level completion heatmap."""
    db = get_db()
    employees = await db.users.find({"role": "employee"}).to_list(None)

    dept_data = defaultdict(lambda: {"employees": [], "scores": [], "completion_rates": []})

    for emp in employees:
        dept = emp.get("department", "Unassigned")
        emp_id = str(emp["_id"])
        goals = await db.goals.find({
            "employee_id": emp_id,
            "cycle_id": cycle_id,
            "status": "approved"
        }).to_list(None)

        score = compute_overall_score(goals)
        completed = sum(1 for g in goals if g.get("progress_status") == "completed")
        completion_rate = round(completed / len(goals) * 100, 1) if goals else 0

        dept_data[dept]["employees"].append(emp["name"])
        if score is not None:
            dept_data[dept]["scores"].append(score)
        dept_data[dept]["completion_rates"].append(completion_rate)

    result = []
    for dept, data in dept_data.items():
        avg_score = round(sum(data["scores"]) / len(data["scores"]), 1) if data["scores"] else 0
        avg_completion = round(sum(data["completion_rates"]) / len(data["completion_rates"]), 1) if data["completion_rates"] else 0
        result.append({
            "department": dept,
            "employee_count": len(data["employees"]),
            "avg_score": avg_score,
            "avg_completion_rate": avg_completion,
        })

    return {"cycle_id": cycle_id, "departments": result}


@router.get("/quarterly-trend/{cycle_id}")
async def get_quarterly_trend(
    cycle_id: str,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "manager", "employee"))
):
    """Quarter-on-Quarter achievement trend."""
    db = get_db()

    if current_user["role"] == "employee":
        employee_id = str(current_user["_id"])

    query = {"cycle_id": cycle_id, "status": "approved"}
    if employee_id:
        query["employee_id"] = employee_id
    elif current_user["role"] == "manager":
        team = await db.users.find({"manager_id": str(current_user["_id"])}).to_list(None)
        query["employee_id"] = {"$in": [str(e["_id"]) for e in team]}

    goals = await db.goals.find(query).to_list(None)

    quarters = ["Q1", "Q2", "Q3", "Q4"]
    trend = []

    for q in quarters:
        q_scores = []
        for g in goals:
            for ach in g.get("quarterly_achievements", []):
                if ach["quarter"] == q and ach.get("progress_score") is not None:
                    q_scores.append(ach["progress_score"])
        trend.append({
            "quarter": q,
            "avg_score": round(sum(q_scores) / len(q_scores), 1) if q_scores else None,
            "goals_updated": len(q_scores),
        })

    return {"cycle_id": cycle_id, "trend": trend}


@router.get("/ai-insights/{cycle_id}")
async def get_ai_insights(
    cycle_id: str,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    """Generate AI-powered insights from analytics data."""
    db = get_db()

    emp_query = {"role": "employee"}
    if current_user["role"] == "manager":
        emp_query["manager_id"] = str(current_user["_id"])

    employees = await db.users.find(emp_query).to_list(None)
    emp_ids = [str(e["_id"]) for e in employees]

    all_goals = await db.goals.find({
        "employee_id": {"$in": emp_ids},
        "cycle_id": cycle_id
    }).to_list(None)

    approved = [g for g in all_goals if g["status"] == "approved"]
    scores = [ach["progress_score"] for g in approved
              for ach in g.get("quarterly_achievements", [])
              if ach.get("progress_score") is not None]

    thrust_breakdown = defaultdict(int)
    for g in all_goals:
        thrust_breakdown[g["thrust_area"]] += 1

    top_dept = None
    if current_user["role"] == "admin":
        dept_scores = defaultdict(list)
        for emp in employees:
            emp_goals = [g for g in approved if g["employee_id"] == str(emp["_id"])]
            score = compute_overall_score(emp_goals)
            if score and emp.get("department"):
                dept_scores[emp["department"]].append(score)
        if dept_scores:
            top_dept = max(dept_scores, key=lambda d: sum(dept_scores[d]) / len(dept_scores[d]))

    checkin_count = await db.checkin_comments.count_documents({
        "employee_id": {"$in": emp_ids}
    })
    checkin_rate = round(checkin_count / (len(emp_ids) * 4) * 100, 1) if emp_ids else 0

    analytics_data = {
        "total_employees": len(emp_ids),
        "goals_submitted": sum(1 for g in all_goals if g["status"] != "draft"),
        "goals_approved": len(approved),
        "avg_completion_rate": round(sum(scores) / len(scores), 1) if scores else 0,
        "top_department": top_dept or "N/A",
        "checkin_completion_rate": checkin_rate,
        "thrust_area_breakdown": dict(thrust_breakdown),
    }

    try:
        insights = await generate_analytics_insight(analytics_data)
        return {"success": True, "insights": insights, "data": analytics_data}
    except Exception as exc:
        logger.error(f"[Analytics] ai-insights endpoint error: {type(exc).__name__}: {exc}")
        return {
            "success": False,
            "insights": "",
            "message": "AI insights temporarily unavailable. Please try again shortly.",
            "data": analytics_data,
        }


@router.get("/audit-log/{goal_id}")
async def get_audit_log(
    goal_id: str,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    """Get audit trail for a goal."""
    db = get_db()
    logs = await db.audit_logs.find({"goal_id": goal_id}).sort("created_at", -1).to_list(None)
    return [{**log, "id": str(log["_id"])} for log in logs]


@router.get("/export/{cycle_id}")
async def export_achievement_report(
    cycle_id: str,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    """Export achievement data as JSON (frontend converts to CSV/Excel)."""
    db = get_db()

    emp_query = {"role": "employee"}
    if current_user["role"] == "manager":
        emp_query["manager_id"] = str(current_user["_id"])

    employees = await db.users.find(emp_query).to_list(None)
    rows = []

    for emp in employees:
        emp_id = str(emp["_id"])
        goals = await db.goals.find({
            "employee_id": emp_id,
            "cycle_id": cycle_id
        }).to_list(None)

        for g in goals:
            base_row = {
                "Employee Name": emp["name"],
                "Employee Email": emp["email"],
                "Department": emp.get("department", ""),
                "Cycle": cycle_id,
                "Thrust Area": g["thrust_area"],
                "Goal Title": g["title"],
                "UoM Type": g["uom_type"],
                "Target Value": g.get("target_value", ""),
                "Weightage": g["weightage"],
                "Status": g["status"],
            }
            achievements = g.get("quarterly_achievements", [])
            if achievements:
                for ach in achievements:
                    row = {**base_row,
                           "Quarter": ach["quarter"],
                           "Actual Value": ach.get("actual_value", ""),
                           "Progress Status": ach.get("progress_status", ""),
                           "Progress Score": ach.get("progress_score", ""),
                           "Notes": ach.get("notes", "")}
                    rows.append(row)
            else:
                rows.append({**base_row, "Quarter": "", "Actual Value": "",
                             "Progress Status": "", "Progress Score": "", "Notes": ""})

    return {"data": rows, "total_rows": len(rows)}
