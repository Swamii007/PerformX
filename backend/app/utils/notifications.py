"""
Notification helper — creates notification documents in MongoDB.
Called from goal/checkin routers whenever a key event occurs.
"""
from datetime import datetime
from app.database import get_db


async def create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    goal_id: str = None,
    actor_name: str = None,
):
    db = get_db()
    doc = {
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "is_read": False,
        "goal_id": goal_id,
        "actor_name": actor_name,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(doc)


# ── Convenience wrappers ──────────────────────────────────────────────────────

async def notify_goal_submitted_to_manager(
    manager_id: str, employee_name: str, goal_title: str, goal_id: str
):
    await create_notification(
        user_id=manager_id,
        notif_type="goal_submitted",
        title="New Goal Submitted",
        message=f"{employee_name} submitted a goal for your approval: \"{goal_title}\"",
        goal_id=goal_id,
        actor_name=employee_name,
    )


async def notify_goal_approved_to_employee(
    employee_id: str, manager_name: str, goal_title: str, goal_id: str
):
    await create_notification(
        user_id=employee_id,
        notif_type="goal_approved",
        title="Goal Approved ✅",
        message=f"Your goal \"{goal_title}\" was approved by {manager_name}.",
        goal_id=goal_id,
        actor_name=manager_name,
    )


async def notify_goal_returned_to_employee(
    employee_id: str, manager_name: str, goal_title: str, goal_id: str, comment: str
):
    await create_notification(
        user_id=employee_id,
        notif_type="goal_returned",
        title="Goal Returned for Rework",
        message=f"{manager_name} returned \"{goal_title}\": {comment[:80]}{'...' if len(comment) > 80 else ''}",
        goal_id=goal_id,
        actor_name=manager_name,
    )


async def notify_goal_unlocked(
    employee_id: str, admin_name: str, goal_title: str, goal_id: str
):
    await create_notification(
        user_id=employee_id,
        notif_type="goal_unlocked",
        title="Goal Unlocked",
        message=f"Admin {admin_name} unlocked your goal \"{goal_title}\" for editing.",
        goal_id=goal_id,
        actor_name=admin_name,
    )


async def notify_shared_goal(
    employee_id: str, manager_name: str, goal_title: str, goal_id: str
):
    await create_notification(
        user_id=employee_id,
        notif_type="shared_goal",
        title="Shared KPI Assigned",
        message=f"{manager_name} assigned you a shared KPI: \"{goal_title}\"",
        goal_id=goal_id,
        actor_name=manager_name,
    )
