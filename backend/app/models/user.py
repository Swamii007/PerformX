from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    department: Optional[str] = None
    manager_id: Optional[str] = None  # reference to manager's user _id


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    id: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    department: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
