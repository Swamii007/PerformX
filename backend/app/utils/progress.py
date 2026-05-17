from typing import Optional
from datetime import datetime


def compute_progress_score(
    uom_type: str,
    target_value: Optional[float],
    actual_value: Optional[float],
    target_date: Optional[datetime],
    actual_date: Optional[datetime],
) -> Optional[float]:
    """
    Compute progress score (0-100) based on UoM type.
    Returns None if insufficient data.
    """
    try:
        if uom_type == "numeric_min":
            # Higher is better: Achievement / Target * 100
            if target_value and target_value != 0 and actual_value is not None:
                score = (actual_value / target_value) * 100
                return round(min(score, 150), 2)  # cap at 150% for overachievement

        elif uom_type == "numeric_max":
            # Lower is better: Target / Achievement * 100
            if actual_value and actual_value != 0 and target_value is not None:
                score = (target_value / actual_value) * 100
                return round(min(score, 150), 2)

        elif uom_type == "timeline":
            # Date-based: completed on or before deadline = 100%, else proportional
            if target_date and actual_date:
                if actual_date <= target_date:
                    return 100.0
                else:
                    # Penalize based on how late
                    days_late = (actual_date - target_date).days
                    penalty = min(days_late * 2, 100)  # 2% per day late, max 100% penalty
                    return round(max(0, 100 - penalty), 2)
            elif target_date and not actual_date:
                # Not yet completed — check if still within deadline
                now = datetime.utcnow()
                if now <= target_date:
                    return None  # In progress, no score yet
                else:
                    return 0.0  # Overdue

        elif uom_type == "zero":
            # Zero = Success
            if actual_value is not None:
                return 100.0 if actual_value == 0 else 0.0

    except (TypeError, ZeroDivisionError):
        pass

    return None


def compute_overall_score(goals: list) -> Optional[float]:
    """
    Weighted average of all approved goals' latest progress scores.
    """
    total_weight = 0
    weighted_sum = 0

    for goal in goals:
        if goal.get("status") != "approved":
            continue
        weightage = goal.get("weightage", 0)
        achievements = goal.get("quarterly_achievements", [])
        if not achievements:
            continue

        # Get latest achievement with a score
        latest_score = None
        for ach in reversed(achievements):
            if ach.get("progress_score") is not None:
                latest_score = ach["progress_score"]
                break

        if latest_score is not None:
            weighted_sum += latest_score * weightage
            total_weight += weightage

    if total_weight == 0:
        return None

    return round(weighted_sum / total_weight, 2)
