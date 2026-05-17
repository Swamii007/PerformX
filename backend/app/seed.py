"""
Seed script — populates PerformX with demo data.
Run: python -m app.seed
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.utils.auth import hash_password
from datetime import datetime, timedelta
import random


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.performx

    print("🌱 Seeding PerformX demo data...")

    # ── Clear existing data ───────────────────────────────────────────────────
    for col in ["users", "goals", "cycles", "checkin_comments", "audit_logs"]:
        await db[col].drop()
    print("  ✅ Cleared existing collections")

    # ── Create Cycle ──────────────────────────────────────────────────────────
    now = datetime.utcnow()
    cycle = {
        "id": "2025-2026",
        "name": "FY 2025-2026",
        "current_phase": "goal_setting",
        "goal_setting_start": datetime(2025, 5, 1),
        "goal_setting_end": datetime(2025, 6, 30),
        "q1_start": datetime(2025, 7, 1),
        "q1_end": datetime(2025, 9, 30),
        "q2_start": datetime(2025, 10, 1),
        "q2_end": datetime(2025, 12, 31),
        "q3_start": datetime(2026, 1, 1),
        "q3_end": datetime(2026, 3, 31),
        "q4_start": datetime(2026, 4, 1),
        "q4_end": datetime(2026, 4, 30),
        "is_active": True,
        "created_at": now,
    }
    await db.cycles.insert_one(cycle)
    print("  ✅ Created cycle: FY 2025-2026")

    # ── Create Users ──────────────────────────────────────────────────────────
    admin = {
        "email": "admin@performx.com",
        "name": "Priya Sharma",
        "role": "admin",
        "department": "HR",
        "manager_id": None,
        "hashed_password": hash_password("Admin@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    admin_result = await db.users.insert_one(admin)
    admin_id = str(admin_result.inserted_id)

    manager = {
        "email": "manager@performx.com",
        "name": "Rahul Mehta",
        "role": "manager",
        "department": "Sales",
        "manager_id": None,
        "hashed_password": hash_password("Manager@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    manager_result = await db.users.insert_one(manager)
    manager_id = str(manager_result.inserted_id)

    manager2 = {
        "email": "manager2@performx.com",
        "name": "Deepa Nair",
        "role": "manager",
        "department": "Engineering",
        "manager_id": None,
        "hashed_password": hash_password("Manager@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    manager2_result = await db.users.insert_one(manager2)
    manager2_id = str(manager2_result.inserted_id)

    emp1 = {
        "email": "employee1@performx.com",
        "name": "Ananya Patel",
        "role": "employee",
        "department": "Sales",
        "manager_id": manager_id,
        "hashed_password": hash_password("Employee@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    emp1_result = await db.users.insert_one(emp1)
    emp1_id = str(emp1_result.inserted_id)

    emp2 = {
        "email": "employee2@performx.com",
        "name": "Vikram Singh",
        "role": "employee",
        "department": "Sales",
        "manager_id": manager_id,
        "hashed_password": hash_password("Employee@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    emp2_result = await db.users.insert_one(emp2)
    emp2_id = str(emp2_result.inserted_id)

    emp3 = {
        "email": "employee3@performx.com",
        "name": "Rohan Desai",
        "role": "employee",
        "department": "Engineering",
        "manager_id": manager2_id,
        "hashed_password": hash_password("Employee@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    emp3_result = await db.users.insert_one(emp3)
    emp3_id = str(emp3_result.inserted_id)

    emp4 = {
        "email": "employee4@performx.com",
        "name": "Sneha Kulkarni",
        "role": "employee",
        "department": "Engineering",
        "manager_id": manager2_id,
        "hashed_password": hash_password("Employee@123"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    emp4_result = await db.users.insert_one(emp4)
    emp4_id = str(emp4_result.inserted_id)

    # Create indexes
    await db.users.create_index("email", unique=True)
    print("  ✅ Created 7 users (1 admin, 2 managers, 4 employees)")

    # ── Create Goals for Employee 1 (Ananya) — Approved with Q1+Q2 data ─────
    ananya_goals = [
        {
            "employee_id": emp1_id,
            "thrust_area": "Revenue Growth",
            "title": "Achieve ₹50L quarterly sales target",
            "description": "Drive revenue through new client acquisition and upselling to existing accounts.",
            "uom_type": "numeric_min",
            "target_value": 5000000,
            "target_date": None,
            "weightage": 30,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 4200000,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 84.0,
                    "notes": "Strong pipeline, 3 deals closing next month",
                    "updated_at": datetime(2025, 8, 15),
                },
                {
                    "quarter": "Q2",
                    "actual_value": 5100000,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Exceeded target. Closed 2 enterprise deals in October.",
                    "updated_at": datetime(2025, 11, 10),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 10),
            "updated_at": datetime(2025, 11, 10),
        },
        {
            "employee_id": emp1_id,
            "thrust_area": "Customer Satisfaction",
            "title": "Maintain NPS score above 75",
            "description": "Ensure high customer satisfaction through proactive engagement and issue resolution.",
            "uom_type": "numeric_min",
            "target_value": 75,
            "target_date": None,
            "weightage": 25,
            "status": "approved",
            "progress_status": "completed",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 82,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Exceeded target. Customer feedback very positive.",
                    "updated_at": datetime(2025, 8, 20),
                },
                {
                    "quarter": "Q2",
                    "actual_value": 79,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Maintained above target despite high volume quarter.",
                    "updated_at": datetime(2025, 11, 15),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 10),
            "updated_at": datetime(2025, 11, 15),
        },
        {
            "employee_id": emp1_id,
            "thrust_area": "People Development",
            "title": "Complete 2 sales certification courses",
            "description": "Upskill through Salesforce and negotiation certifications.",
            "uom_type": "numeric_min",
            "target_value": 2,
            "target_date": None,
            "weightage": 15,
            "status": "approved",
            "progress_status": "completed",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 1,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 50.0,
                    "notes": "Completed Salesforce Admin cert. Working on negotiation course.",
                    "updated_at": datetime(2025, 9, 1),
                },
                {
                    "quarter": "Q2",
                    "actual_value": 2,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Both certifications completed ahead of schedule.",
                    "updated_at": datetime(2025, 11, 5),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 10),
            "updated_at": datetime(2025, 11, 5),
        },
        {
            "employee_id": emp1_id,
            "thrust_area": "Operational Excellence",
            "title": "Reduce sales cycle TAT by 15%",
            "description": "Streamline proposal and approval processes to close deals faster.",
            "uom_type": "numeric_max",
            "target_value": 85,
            "target_date": None,
            "weightage": 20,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 88,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 96.6,
                    "notes": "Improved proposal template reduced TAT by 12%.",
                    "updated_at": datetime(2025, 8, 25),
                },
                {
                    "quarter": "Q2",
                    "actual_value": 84,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Achieved 16% TAT reduction. New CRM workflow implemented.",
                    "updated_at": datetime(2025, 11, 20),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 10),
            "updated_at": datetime(2025, 11, 20),
        },
        {
            "employee_id": emp1_id,
            "thrust_area": "Compliance & Risk",
            "title": "Zero compliance violations",
            "description": "Ensure all sales contracts comply with legal and regulatory requirements.",
            "uom_type": "zero",
            "target_value": 0,
            "target_date": None,
            "weightage": 10,
            "status": "approved",
            "progress_status": "completed",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 0,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "No violations reported.",
                    "updated_at": datetime(2025, 9, 5),
                },
                {
                    "quarter": "Q2",
                    "actual_value": 0,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Clean quarter. All contracts reviewed and compliant.",
                    "updated_at": datetime(2025, 12, 1),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 10),
            "updated_at": datetime(2025, 12, 1),
        },
    ]

    for g in ananya_goals:
        await db.goals.insert_one(g)
    print(f"  ✅ Created {len(ananya_goals)} approved goals for Ananya Patel (Q1+Q2 data)")

    # ── Create Goals for Employee 2 (Vikram) — Mixed states with at_risk ─────
    vikram_goals = [
        {
            "employee_id": emp2_id,
            "thrust_area": "Revenue Growth",
            "title": "Onboard 10 new enterprise clients",
            "description": "Focus on enterprise segment to drive high-value deals.",
            "uom_type": "numeric_min",
            "target_value": 10,
            "target_date": None,
            "weightage": 35,
            "status": "approved",
            "progress_status": "at_risk",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 2,
                    "actual_date": None,
                    "progress_status": "at_risk",
                    "progress_score": 20.0,
                    "notes": "Only 2 clients onboarded vs target of 10. Pipeline needs urgent attention.",
                    "updated_at": datetime(2025, 9, 20),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 12),
            "updated_at": datetime(2025, 9, 20),
        },
        {
            "employee_id": emp2_id,
            "thrust_area": "Cost Optimization",
            "title": "Reduce travel expenses by 20%",
            "description": "Optimize travel planning and use virtual meetings where possible.",
            "uom_type": "numeric_max",
            "target_value": 80,
            "target_date": None,
            "weightage": 20,
            "status": "submitted",
            "progress_status": "not_started",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [],
            "is_shared": False,
            "created_at": datetime(2025, 5, 12),
            "updated_at": datetime(2025, 5, 18),
        },
        {
            "employee_id": emp2_id,
            "thrust_area": "Innovation",
            "title": "Launch 1 new sales automation initiative",
            "description": "Implement CRM automation to reduce manual data entry.",
            "uom_type": "timeline",
            "target_value": None,
            "target_date": datetime(2025, 12, 31),
            "weightage": 25,
            "status": "returned",
            "progress_status": "not_started",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [],
            "is_shared": False,
            "manager_comment": "Please define clearer success metrics for this initiative. What does 'launched' mean — pilot, full rollout, or user adoption target?",
            "created_at": datetime(2025, 5, 12),
            "updated_at": datetime(2025, 5, 22),
        },
        {
            "employee_id": emp2_id,
            "thrust_area": "People Development",
            "title": "Mentor 2 junior sales associates",
            "description": "Provide weekly coaching sessions to junior team members.",
            "uom_type": "numeric_min",
            "target_value": 2,
            "target_date": None,
            "weightage": 20,
            "status": "draft",
            "progress_status": "not_started",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [],
            "is_shared": False,
            "created_at": datetime(2025, 5, 15),
            "updated_at": datetime(2025, 5, 15),
        },
    ]

    for g in vikram_goals:
        await db.goals.insert_one(g)
    print(f"  ✅ Created {len(vikram_goals)} goals for Vikram Singh (mixed states + at_risk)")

    # ── Create Goals for Employee 3 (Rohan) — Engineering ────────────────────
    rohan_goals = [
        {
            "employee_id": emp3_id,
            "thrust_area": "Operational Excellence",
            "title": "Reduce system downtime to < 0.1%",
            "description": "Improve infrastructure reliability through proactive monitoring and incident response.",
            "uom_type": "numeric_max",
            "target_value": 0.1,
            "target_date": None,
            "weightage": 30,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 0.08,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Achieved 0.08% downtime. New alerting system deployed.",
                    "updated_at": datetime(2025, 9, 10),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 14),
            "updated_at": datetime(2025, 9, 10),
        },
        {
            "employee_id": emp3_id,
            "thrust_area": "Innovation",
            "title": "Ship 3 major product features",
            "description": "Deliver high-impact features from the product roadmap.",
            "uom_type": "numeric_min",
            "target_value": 3,
            "target_date": None,
            "weightage": 35,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 1,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 33.3,
                    "notes": "Shipped smart notifications feature. 2 more in progress.",
                    "updated_at": datetime(2025, 9, 15),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 14),
            "updated_at": datetime(2025, 9, 15),
        },
        {
            "employee_id": emp3_id,
            "thrust_area": "Quality",
            "title": "Achieve 90%+ test coverage",
            "description": "Improve code quality through comprehensive unit and integration tests.",
            "uom_type": "numeric_min",
            "target_value": 90,
            "target_date": None,
            "weightage": 20,
            "status": "approved",
            "progress_status": "at_risk",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 62,
                    "actual_date": None,
                    "progress_status": "at_risk",
                    "progress_score": 68.9,
                    "notes": "Coverage at 62%. Legacy modules are difficult to test. Need dedicated sprint.",
                    "updated_at": datetime(2025, 9, 25),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 14),
            "updated_at": datetime(2025, 9, 25),
        },
        {
            "employee_id": emp3_id,
            "thrust_area": "People Development",
            "title": "Complete AWS Solutions Architect certification",
            "description": "Obtain AWS certification to improve cloud architecture skills.",
            "uom_type": "timeline",
            "target_value": None,
            "target_date": datetime(2025, 12, 31),
            "weightage": 15,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": None,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 75.0,
                    "notes": "Completed 60% of study material. Exam scheduled for December.",
                    "updated_at": datetime(2025, 9, 28),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 14),
            "updated_at": datetime(2025, 9, 28),
        },
    ]

    for g in rohan_goals:
        await db.goals.insert_one(g)
    print(f"  ✅ Created {len(rohan_goals)} goals for Rohan Desai (Engineering)")

    # ── Create Goals for Employee 4 (Sneha) — Engineering ────────────────────
    sneha_goals = [
        {
            "employee_id": emp4_id,
            "thrust_area": "Quality",
            "title": "Reduce production bug rate by 40%",
            "description": "Implement better QA processes and automated regression testing.",
            "uom_type": "numeric_max",
            "target_value": 60,
            "target_date": None,
            "weightage": 30,
            "status": "approved",
            "progress_status": "completed",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 55,
                    "actual_date": None,
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Bug rate reduced by 45%. Automated regression suite deployed.",
                    "updated_at": datetime(2025, 9, 12),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 16),
            "updated_at": datetime(2025, 9, 12),
        },
        {
            "employee_id": emp4_id,
            "thrust_area": "Operational Excellence",
            "title": "Reduce API response time by 30%",
            "description": "Optimize database queries and implement caching strategies.",
            "uom_type": "numeric_max",
            "target_value": 70,
            "target_date": None,
            "weightage": 35,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 78,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 89.7,
                    "notes": "22% improvement achieved. Redis caching implemented for hot paths.",
                    "updated_at": datetime(2025, 9, 18),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 16),
            "updated_at": datetime(2025, 9, 18),
        },
        {
            "employee_id": emp4_id,
            "thrust_area": "Innovation",
            "title": "Implement AI-powered code review tool",
            "description": "Integrate LLM-based code review into the CI/CD pipeline.",
            "uom_type": "timeline",
            "target_value": None,
            "target_date": datetime(2025, 11, 30),
            "weightage": 25,
            "status": "approved",
            "progress_status": "completed",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": None,
                    "actual_date": datetime(2025, 9, 30),
                    "progress_status": "completed",
                    "progress_score": 100.0,
                    "notes": "Tool shipped ahead of schedule. 85% of PRs now auto-reviewed.",
                    "updated_at": datetime(2025, 9, 30),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 16),
            "updated_at": datetime(2025, 9, 30),
        },
        {
            "employee_id": emp4_id,
            "thrust_area": "People Development",
            "title": "Conduct 4 internal tech talks",
            "description": "Share knowledge with the team through monthly tech talks.",
            "uom_type": "numeric_min",
            "target_value": 4,
            "target_date": None,
            "weightage": 10,
            "status": "approved",
            "progress_status": "on_track",
            "cycle_id": "2025-2026",
            "quarterly_achievements": [
                {
                    "quarter": "Q1",
                    "actual_value": 2,
                    "actual_date": None,
                    "progress_status": "on_track",
                    "progress_score": 50.0,
                    "notes": "Delivered talks on Redis caching and API design patterns.",
                    "updated_at": datetime(2025, 9, 22),
                },
            ],
            "is_shared": False,
            "created_at": datetime(2025, 5, 16),
            "updated_at": datetime(2025, 9, 22),
        },
    ]

    for g in sneha_goals:
        await db.goals.insert_one(g)
    print(f"  ✅ Created {len(sneha_goals)} goals for Sneha Kulkarni (Engineering)")

    # ── Create Check-in Comments ──────────────────────────────────────────────
    ananya_goal_ids = []
    async for g in db.goals.find({"employee_id": emp1_id}):
        ananya_goal_ids.append(str(g["_id"]))

    vikram_goal_ids = []
    async for g in db.goals.find({"employee_id": emp2_id}):
        vikram_goal_ids.append(str(g["_id"]))

    rohan_goal_ids = []
    async for g in db.goals.find({"employee_id": emp3_id}):
        rohan_goal_ids.append(str(g["_id"]))

    if ananya_goal_ids:
        comments = [
            {
                "goal_id": ananya_goal_ids[0],
                "quarter": "Q1",
                "comment": "Ananya is performing well on the sales target. Pipeline looks strong with 3 major deals expected to close in Q2. Recommend focusing on enterprise segment for higher deal values.",
                "manager_id": manager_id,
                "manager_name": "Rahul Mehta",
                "employee_id": emp1_id,
                "created_at": datetime(2025, 8, 20),
            },
            {
                "goal_id": ananya_goal_ids[1],
                "quarter": "Q1",
                "comment": "Excellent NPS score of 82, well above target. Customer feedback highlights Ananya's responsiveness and product knowledge. Keep up the great work.",
                "manager_id": manager_id,
                "manager_name": "Rahul Mehta",
                "employee_id": emp1_id,
                "created_at": datetime(2025, 8, 22),
            },
            {
                "goal_id": ananya_goal_ids[0],
                "quarter": "Q2",
                "comment": "Outstanding Q2 performance — exceeded the ₹50L target by 2%. The enterprise deal strategy is clearly working. Recommend maintaining this momentum into Q3.",
                "manager_id": manager_id,
                "manager_name": "Rahul Mehta",
                "employee_id": emp1_id,
                "created_at": datetime(2025, 11, 12),
            },
        ]
        for c in comments:
            await db.checkin_comments.insert_one(c)

    if vikram_goal_ids:
        vikram_comments = [
            {
                "goal_id": vikram_goal_ids[0],
                "quarter": "Q1",
                "comment": "Vikram's enterprise client acquisition is significantly behind target. Only 2 out of 10 clients onboarded. Need to review the outreach strategy and identify blockers. Scheduling a 1:1 to discuss action plan.",
                "manager_id": manager_id,
                "manager_name": "Rahul Mehta",
                "employee_id": emp2_id,
                "created_at": datetime(2025, 9, 22),
            },
        ]
        for c in vikram_comments:
            await db.checkin_comments.insert_one(c)

    if rohan_goal_ids:
        rohan_comments = [
            {
                "goal_id": rohan_goal_ids[2],
                "quarter": "Q1",
                "comment": "Test coverage at 62% is below the 90% target. The legacy module issue is a known blocker. Allocating 2 sprints in Q2 specifically for test coverage improvement. Rohan should prioritize this.",
                "manager_id": manager2_id,
                "manager_name": "Deepa Nair",
                "employee_id": emp3_id,
                "created_at": datetime(2025, 9, 27),
            },
        ]
        for c in rohan_comments:
            await db.checkin_comments.insert_one(c)

    total_comments = len(comments if ananya_goal_ids else []) + len(vikram_comments if vikram_goal_ids else []) + len(rohan_comments if rohan_goal_ids else [])
    print(f"  ✅ Created {total_comments} check-in comments across all employees")

    # ── Create Audit Logs ─────────────────────────────────────────────────────
    if ananya_goal_ids:
        audit_logs = [
            {
                "goal_id": ananya_goal_ids[0],
                "changed_by": manager_id,
                "changed_by_name": "Rahul Mehta",
                "change_type": "approve",
                "field_changed": None,
                "old_value": None,
                "new_value": None,
                "reason": None,
                "created_at": datetime(2025, 5, 20),
            },
            {
                "goal_id": ananya_goal_ids[0],
                "changed_by": admin_id,
                "changed_by_name": "Priya Sharma",
                "change_type": "unlock",
                "field_changed": "status",
                "old_value": "approved",
                "new_value": "draft",
                "reason": "Employee requested target revision due to market conditions",
                "created_at": datetime(2025, 7, 5),
            },
            {
                "goal_id": ananya_goal_ids[0],
                "changed_by": manager_id,
                "changed_by_name": "Rahul Mehta",
                "change_type": "approve",
                "field_changed": None,
                "old_value": None,
                "new_value": None,
                "reason": None,
                "created_at": datetime(2025, 7, 8),
            },
        ]
        for log in audit_logs:
            await db.audit_logs.insert_one(log)
        print(f"  ✅ Created {len(audit_logs)} audit log entries")

    # ── Create indexes ────────────────────────────────────────────────────────
    await db.goals.create_index([("employee_id", 1), ("cycle_id", 1)])
    await db.goals.create_index("shared_goal_id")
    await db.audit_logs.create_index([("goal_id", 1), ("created_at", -1)])
    await db.checkin_comments.create_index([("goal_id", 1), ("quarter", 1)])

    print("\n🎉 Seed complete! Demo credentials:")
    print("  👤 Admin:     admin@performx.com     / Admin@123")
    print("  👤 Manager:   manager@performx.com   / Manager@123  (Sales team)")
    print("  👤 Manager:   manager2@performx.com  / Manager@123  (Engineering team)")
    print("  👤 Employee1: employee1@performx.com / Employee@123  (Ananya — top performer, Q1+Q2 data)")
    print("  👤 Employee2: employee2@performx.com / Employee@123  (Vikram — at_risk + mixed states)")
    print("  👤 Employee3: employee3@performx.com / Employee@123  (Rohan — Engineering, at_risk goal)")
    print("  👤 Employee4: employee4@performx.com / Employee@123  (Sneha — Engineering, strong performer)")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
