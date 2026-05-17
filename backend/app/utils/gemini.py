"""
Async-safe Gemini integration for FastAPI.

All blocking Gemini SDK calls run in a ThreadPoolExecutor so they never
block the uvicorn event loop.  The model cache is reset on any hard
failure so the next request triggers a fresh initialisation attempt.
"""

import asyncio
import logging
import json
import re
from concurrent.futures import ThreadPoolExecutor

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)

# ── Module-level state ────────────────────────────────────────────────────────

_model = None          # cached GenerativeModel instance
_model_name: str = ""  # name of the cached model (for logging)
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="gemini")

# Tried in order; first one that responds wins
CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
]

# Per-request timeout (seconds) for Gemini calls
AI_TIMEOUT = 30


# ── Model initialisation ──────────────────────────────────────────────────────

def _init_model_sync() -> object | None:
    """
    Probe each candidate model synchronously.
    Intended to run inside the thread pool — never call from the event loop.
    Returns a ready GenerativeModel or None.
    """
    global _model, _model_name

    # Return cached instance if already initialised
    if _model is not None:
        return _model

    if not settings.GEMINI_API_KEY:
        logger.warning("[Gemini] GEMINI_API_KEY not set — AI features disabled")
        return None

    genai.configure(api_key=settings.GEMINI_API_KEY)

    for name in CANDIDATE_MODELS:
        try:
            logger.info(f"[Gemini] Probing model: {name}")
            candidate = genai.GenerativeModel(name)
            probe = candidate.generate_content("Reply with the single word: ready")
            if probe.text:
                _model = candidate
                _model_name = name
                logger.info(f"[Gemini] ✅ Ready — using {name}")
                return _model
        except Exception as exc:
            err = str(exc)
            if "429" in err or "quota" in err.lower():
                logger.warning(f"[Gemini] ⚠️  {name}: quota exhausted — trying next")
            elif "404" in err or "not found" in err.lower():
                logger.warning(f"[Gemini] ⚠️  {name}: not available — trying next")
            else:
                logger.error(f"[Gemini] ❌ {name}: unexpected error — {err[:200]}")

    logger.error("[Gemini] ❌ All candidate models failed — AI features will use rule-based fallbacks")
    return None


async def get_model_async() -> object | None:
    """
    Return a ready Gemini model without blocking the event loop.
    Runs _init_model_sync in the thread pool on first call.
    """
    if _model is not None:
        return _model
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _init_model_sync)


def reset_model() -> None:
    """
    Clear the cached model so the next request triggers re-initialisation.
    Call this after quota errors or key rotation.
    """
    global _model, _model_name
    logger.info(f"[Gemini] Model cache reset (was: {_model_name or 'none'})")
    _model = None
    _model_name = ""


async def _generate(model, prompt: str) -> str:
    """
    Run model.generate_content in the thread pool with a timeout.
    Raises asyncio.TimeoutError if the call exceeds AI_TIMEOUT seconds.
    """
    loop = asyncio.get_event_loop()
    future = loop.run_in_executor(_executor, lambda: model.generate_content(prompt))
    return await asyncio.wait_for(future, timeout=AI_TIMEOUT)


# ── Goal Suggestions ──────────────────────────────────────────────────────────

async def suggest_goals(
    thrust_area: str,
    department: str,
    role: str,
    existing_titles: list[str] | None = None,
) -> list[dict]:
    """Return 3 SMART goal suggestions for the given thrust area."""
    model = await get_model_async()
    if not model:
        logger.info("[Gemini] suggest_goals: AI unavailable — using fallback")
        return _fallback_suggestions(thrust_area)

    existing = ", ".join(existing_titles) if existing_titles else "none"
    prompt = f"""You are an expert HR performance consultant. Generate 3 SMART goal suggestions for:
- Department: {department}
- Role: {role}
- Thrust Area: {thrust_area}
- Already defined goals (avoid duplicates): {existing}

Return ONLY a valid JSON array with exactly 3 objects. Each object must have:
- "title": string (concise, action-oriented, max 10 words)
- "description": string (1-2 sentences explaining the goal)
- "uom_type": one of ["numeric_min", "numeric_max", "timeline", "zero"]
- "target_value": number or null (for timeline/zero types)
- "weightage_suggestion": number between 10 and 40
- "rationale": string (why this goal matters for the thrust area)

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        logger.info(f"[Gemini] suggest_goals: requesting suggestions for thrust_area={thrust_area!r}")
        response = await _generate(model, prompt)
        text = re.sub(r"```json\s*|\s*```", "", response.text.strip()).strip()
        suggestions = json.loads(text)
        logger.info(f"[Gemini] suggest_goals: ✅ returned {len(suggestions)} suggestions")
        return suggestions[:3]
    except asyncio.TimeoutError:
        logger.error(f"[Gemini] suggest_goals: ⏱ timed out after {AI_TIMEOUT}s")
        reset_model()
        return _fallback_suggestions(thrust_area)
    except json.JSONDecodeError as exc:
        logger.error(f"[Gemini] suggest_goals: JSON parse error — {exc}")
        return _fallback_suggestions(thrust_area)
    except Exception as exc:
        err = str(exc)
        logger.error(f"[Gemini] suggest_goals: {type(exc).__name__}: {err[:200]}")
        if "429" in err or "quota" in err.lower():
            logger.warning("[Gemini] suggest_goals: quota hit — resetting model cache")
            reset_model()
        return _fallback_suggestions(thrust_area)


# ── Check-in Summarisation ────────────────────────────────────────────────────

async def summarize_checkin_comments(
    comments: list[str],
    employee_name: str,
    quarter: str,
) -> str:
    """Summarise manager check-in comments for an employee."""
    model = await get_model_async()
    if not model or not comments:
        logger.info("[Gemini] summarize_checkin_comments: AI unavailable or no comments")
        return "No comments available for summarization."

    comments_text = "\n".join(f"- {c}" for c in comments)
    prompt = f"""You are an HR performance analyst. Summarize the following manager check-in comments
for employee {employee_name} during {quarter}:

{comments_text}

Write a concise 2-3 sentence professional summary that captures:
1. Overall performance trend
2. Key achievements or concerns
3. Recommended next steps

Keep it factual, professional, and under 100 words."""

    try:
        logger.info(f"[Gemini] summarize_checkin_comments: summarising {len(comments)} comments for {employee_name}")
        response = await _generate(model, prompt)
        result = response.text.strip()
        logger.info(f"[Gemini] summarize_checkin_comments: ✅ {len(result)} chars")
        return result
    except asyncio.TimeoutError:
        logger.error(f"[Gemini] summarize_checkin_comments: ⏱ timed out after {AI_TIMEOUT}s")
        reset_model()
        return "Summary temporarily unavailable. Please review comments manually."
    except Exception as exc:
        err = str(exc)
        logger.error(f"[Gemini] summarize_checkin_comments: {type(exc).__name__}: {err[:200]}")
        if "429" in err or "quota" in err.lower():
            reset_model()
        return f"Summary unavailable ({type(exc).__name__}). Please review comments manually."


# ── Analytics Insights ────────────────────────────────────────────────────────

async def generate_analytics_insight(analytics_data: dict) -> str:
    """Generate 3-4 actionable AI insights from aggregated analytics data."""
    model = await get_model_async()
    if not model:
        logger.info("[Gemini] generate_analytics_insight: AI unavailable — using rule-based fallback")
        return _fallback_insight(analytics_data)

    prompt = f"""You are an HR analytics expert. Analyze this performance data and provide 3-4 actionable insights:

Data:
- Total employees: {analytics_data.get('total_employees', 0)}
- Goals submitted: {analytics_data.get('goals_submitted', 0)}
- Goals approved: {analytics_data.get('goals_approved', 0)}
- Average completion rate: {analytics_data.get('avg_completion_rate', 0)}%
- Top performing department: {analytics_data.get('top_department', 'N/A')}
- Check-in completion rate: {analytics_data.get('checkin_completion_rate', 0)}%
- Goals by thrust area: {analytics_data.get('thrust_area_breakdown', {})}

Provide insights in this format:
1. [Insight title]: [1-2 sentence explanation with specific recommendation]
2. [Insight title]: [1-2 sentence explanation with specific recommendation]
3. [Insight title]: [1-2 sentence explanation with specific recommendation]

Be specific, data-driven, and actionable. Keep total response under 200 words."""

    try:
        logger.info("[Gemini] generate_analytics_insight: requesting insights")
        response = await _generate(model, prompt)
        result = response.text.strip()
        logger.info(f"[Gemini] generate_analytics_insight: ✅ {len(result)} chars")
        return result
    except asyncio.TimeoutError:
        logger.error(f"[Gemini] generate_analytics_insight: ⏱ timed out after {AI_TIMEOUT}s")
        reset_model()
        return _fallback_insight(analytics_data)
    except Exception as exc:
        err = str(exc)
        logger.error(f"[Gemini] generate_analytics_insight: {type(exc).__name__}: {err[:200]}")
        if "429" in err or "quota" in err.lower():
            logger.warning("[Gemini] generate_analytics_insight: quota hit — resetting model cache for retry")
            reset_model()
        return _fallback_insight(analytics_data)


# ── Rule-based fallbacks ──────────────────────────────────────────────────────

def _fallback_insight(data: dict) -> str:
    """Generate rule-based insights when AI is unavailable."""
    total = data.get("total_employees", 0)
    approved = data.get("goals_approved", 0)
    submitted = data.get("goals_submitted", 0)
    avg_score = data.get("avg_completion_rate", 0)
    checkin_rate = data.get("checkin_completion_rate", 0)
    thrust = data.get("thrust_area_breakdown", {})

    insights = []

    if total > 0:
        sub_rate = round(submitted / total * 100)
        if sub_rate < 80:
            insights.append(
                f"1. Low Goal Submission Rate: Only {sub_rate}% of employees have submitted goals. "
                f"Consider sending reminders to the {total - submitted} employees who haven't submitted yet."
            )
        else:
            insights.append(
                f"1. Strong Goal Submission: {sub_rate}% submission rate indicates good engagement. "
                f"Focus on ensuring all {approved} approved goals have clear success metrics."
            )

    if avg_score > 0:
        if avg_score >= 80:
            insights.append(
                f"2. High Performance: Average score of {avg_score}% is excellent. "
                f"Identify top performers and document best practices for knowledge sharing."
            )
        elif avg_score >= 60:
            insights.append(
                f"2. Moderate Performance: Average score of {avg_score}% shows room for improvement. "
                f"Schedule mid-cycle coaching sessions for employees scoring below 70%."
            )
        else:
            insights.append(
                f"2. Performance Concern: Average score of {avg_score}% is below target. "
                f"Immediate manager intervention recommended for at-risk goals."
            )

    if checkin_rate < 50:
        insights.append(
            f"3. Check-in Compliance: Only {checkin_rate}% check-in completion rate. "
            f"Enforce quarterly check-in deadlines and send automated reminders."
        )
    else:
        insights.append(
            f"3. Good Check-in Compliance: {checkin_rate}% completion rate. "
            f"Maintain momentum by recognising managers with 100% team check-in rates."
        )

    if thrust:
        top_area = max(thrust, key=thrust.get)
        insights.append(
            f"4. Dominant Thrust Area: '{top_area}' has the most goals ({thrust[top_area]}). "
            f"Ensure balanced coverage across all strategic pillars."
        )

    return "\n".join(insights) if insights else "Insufficient data to generate insights."


def _fallback_suggestions(thrust_area: str) -> list[dict]:
    """Hardcoded fallback suggestions when AI is unavailable."""
    fallbacks = {
        "Revenue Growth": [
            {"title": "Increase monthly sales by 15%", "description": "Drive revenue through new client acquisition.", "uom_type": "numeric_min", "target_value": 115, "weightage_suggestion": 25, "rationale": "Core revenue driver"},
            {"title": "Expand customer base by 20 new accounts", "description": "Acquire new enterprise customers.", "uom_type": "numeric_min", "target_value": 20, "weightage_suggestion": 20, "rationale": "Pipeline growth"},
            {"title": "Achieve 90% renewal rate", "description": "Retain existing customers through proactive engagement.", "uom_type": "numeric_min", "target_value": 90, "weightage_suggestion": 15, "rationale": "Revenue retention"},
        ],
        "Cost Optimization": [
            {"title": "Reduce operational costs by 10%", "description": "Identify and eliminate inefficiencies.", "uom_type": "numeric_max", "target_value": 90, "weightage_suggestion": 25, "rationale": "Direct cost impact"},
            {"title": "Reduce process TAT by 20%", "description": "Streamline workflows to reduce turnaround time.", "uom_type": "numeric_max", "target_value": 80, "weightage_suggestion": 20, "rationale": "Efficiency improvement"},
            {"title": "Zero safety incidents", "description": "Maintain zero workplace safety incidents.", "uom_type": "zero", "target_value": None, "weightage_suggestion": 15, "rationale": "Safety compliance"},
        ],
        "Customer Satisfaction": [
            {"title": "Achieve NPS score of 75+", "description": "Improve customer satisfaction through proactive support.", "uom_type": "numeric_min", "target_value": 75, "weightage_suggestion": 25, "rationale": "Customer loyalty metric"},
            {"title": "Reduce support ticket resolution time by 30%", "description": "Faster resolution improves customer experience.", "uom_type": "numeric_max", "target_value": 70, "weightage_suggestion": 20, "rationale": "Service quality"},
            {"title": "Achieve 95% first-call resolution rate", "description": "Resolve customer issues on first contact.", "uom_type": "numeric_min", "target_value": 95, "weightage_suggestion": 15, "rationale": "Efficiency and satisfaction"},
        ],
    }
    default = [
        {"title": "Complete key project milestone on time", "description": "Deliver project on time and within scope.", "uom_type": "timeline", "target_value": None, "weightage_suggestion": 20, "rationale": "Project delivery"},
        {"title": "Achieve team satisfaction score of 85%", "description": "Improve team engagement and satisfaction.", "uom_type": "numeric_min", "target_value": 85, "weightage_suggestion": 15, "rationale": "People development"},
        {"title": "Complete 2 training certifications", "description": "Upskill through relevant certifications.", "uom_type": "numeric_min", "target_value": 2, "weightage_suggestion": 10, "rationale": "Skill development"},
    ]
    return fallbacks.get(thrust_area, default)
