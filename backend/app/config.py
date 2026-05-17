from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    MONGODB_URI: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    GEMINI_API_KEY: Optional[str] = None

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
