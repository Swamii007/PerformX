from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routers import auth, users, goals, checkins, analytics, ai, cycles
from app.routers import notifications
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="PerformX API",
    description="In-House Goal Setting & Tracking Portal — AtomQuest Hackathon 1.0",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        settings.FRONTEND_URL,
    ],
    # Glob patterns are NOT supported by Starlette — use allow_origin_regex for Vercel
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Length"],
    max_age=600,
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(checkins.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(cycles.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": "PerformX",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
