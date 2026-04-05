import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import resend
from database import get_db
from models import User as UserModel
from schemas import UserCreate, UserUpdate, UserResponse, SignupRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from utils.authentication import get_current_user, create_access_token
from config import RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL

resend.api_key = RESEND_API_KEY

router = APIRouter()


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login a user"""
    user = db.query(UserModel).filter(UserModel.email == data.email, UserModel.password == data.password).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    access_token = create_access_token(data={"sub": user.name, "id": user.id, "email": user.email})
    return {
        "message": "Login Successful",
        "token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email}
    }

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    """Signup a new user"""
    existing_user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    new_user = UserModel(name=data.name, email=data.email, password=data.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.name, "id": new_user.id, "email": new_user.email})
    return {
        "status": "success",
        "message": f"User {data.name} signed up successfully",
        "token": access_token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email}
    }

@router.post("/forgot_password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password reset email via Resend"""
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if user is None:
        # Return success anyway to prevent email enumeration
        return {"message": "If that email exists, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    resend.Emails.send({
        "from": RESEND_FROM_EMAIL,
        "to": user.email,
        "subject": "Password Reset Request",
        "html": f"""
            <p>Hi {user.name},</p>
            <p>We received a request to reset your password. Click the link below to set a new password:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>This link expires in <strong>15 minutes</strong>.</p>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
        """
    })

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset_password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid token"""
    user = db.query(UserModel).filter(UserModel.reset_token == data.token).first()
    if user is None or user.reset_token_expiry is None or datetime.utcnow() > user.reset_token_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user.password = data.new_password
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return {"message": "Password has been reset successfully."}

@router.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    """A protected route that requires authentication"""
    return {"message": f"Hello, user {current_user['id']}! This is a protected route."}