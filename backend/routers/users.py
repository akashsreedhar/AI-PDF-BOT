import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import resend
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from database import get_db
from models import User as UserModel
from schemas import UserCreate, UserUpdate, UserResponse, SignupRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, GoogleAuthRequest
from utils.authentication import get_current_user, create_access_token
from config import RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL, GOOGLE_CLIENT_ID

resend.api_key = RESEND_API_KEY

router = APIRouter()


@router.get("/google-config")
def google_config():
    """Expose public Google auth configuration for frontend runtime fallback."""
    return {
        "enabled": bool(GOOGLE_CLIENT_ID),
        "client_id": GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else ""
    }


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


@router.post("/google-auth")
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google ID token, creating the user if needed."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication is not configured"
        )

    try:
        token_payload = id_token.verify_oauth2_token(data.id_token, Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    email = token_payload.get("email")
    email_verified = token_payload.get("email_verified", False)
    name = token_payload.get("name") or (email.split("@")[0] if email else "Google User")

    if not email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified"
        )

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        # Local password remains required by schema, so create a random one for OAuth-only users.
        user = UserModel(name=name, email=email, password=secrets.token_urlsafe(32))
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.name, "id": user.id, "email": user.email})
    return {
        "message": "Google authentication successful",
        "token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email}
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