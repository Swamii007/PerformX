from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.performx
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.goals.create_index([("employee_id", 1), ("cycle_id", 1)])
    await db.goals.create_index("shared_goal_id")
    await db.audit_logs.create_index([("goal_id", 1), ("created_at", -1)])
    await db.checkins.create_index([("goal_id", 1), ("quarter", 1)])
    print("✅ Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        print("🔌 Disconnected from MongoDB")


def get_db():
    return db
