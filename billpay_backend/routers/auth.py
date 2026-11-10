"""
Authentication Router
Handles: login, register, Google OAuth, OTP forgot password
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt, uuid, random, string
from datetime import datetime, timedelta

from models.database import get_db, User
from email_service import send_otp_email, is_configured as smtp_configured, OTP_VALIDITY_MINUTES

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:     str
    email:    str
    phone:    Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    email:    str
    password: str

class GoogleAuthRequest(BaseModel):
    token:        str    # Google OAuth token from expo-auth-session
    name:         str
    email:        str

class OtpRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email:        str
    otp:          str
    new_password: str

class ChangePasswordRequest(BaseModel):
    user_id:          int
    current_password: str
    new_password:     str

class UpdateProfileRequest(BaseModel):
    name:  Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id:             int
    name:           str
    email:          str
    phone:          Optional[str]
    provider:       str
    wallet_balance: float
    initials:       str

    class Config:
        from_attributes = True


# ── OTP Store (in-memory for demo — use Redis in production) ──────────────────
OTP_STORE: dict = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def get_initials(name: str) -> str:
    return "".join(w[0] for w in name.split() if w).upper()[:2]

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def user_to_response(user: User) -> dict:
    return {
        "id":             user.id,
        "name":           user.name,
        "email":          user.email,
        "phone":          user.phone,
        "provider":       user.provider,
        "wallet_balance": user.wallet_balance,
        "initials":       get_initials(user.name),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", summary="Register new user")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check email not already registered
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name          = req.name,
        email         = req.email,
        phone         = req.phone,
        password_hash = hash_password(req.password),
        provider      = "email",
        wallet_balance= 0.0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Account created successfully", "user": user_to_response(user)}


@router.post("/login", summary="Login with email and password")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return {"message": "Login successful", "user": user_to_response(user)}


@router.post("/google", summary="Login or register with Google OAuth")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    In production:
    1. Verify req.token with Google: https://oauth2.googleapis.com/tokeninfo?id_token={token}
    2. Extract email, name, sub (Google user ID) from response
    3. Create or update user in database
    """
    # Check if user already exists
    user = db.query(User).filter(User.email == req.email).first()

    if not user:
        # New Google user — register them
        user = User(
            name          = req.name,
            email         = req.email,
            provider      = "google",
            wallet_balance= 0.0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"message": "Google auth successful", "user": user_to_response(user)}


@router.post("/send-otp", summary="Send OTP for password reset")
def send_otp(req: OtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    otp = generate_otp()
    OTP_STORE[req.email] = {"otp": otp, "created_at": datetime.utcnow()}

    sent = send_otp_email(req.email, otp)

    if sent:
        return {
            "message": f"Verification code sent to {req.email}. It expires in {OTP_VALIDITY_MINUTES} minutes.",
            "delivery": "email",
        }

    # SMTP not configured (or send failed) — log to the server console instead.
    # The code is deliberately NOT returned in the response.
    print(f"[OTP] {req.email} -> {otp}   (SMTP not configured; development only)")
    return {
        "message": "Verification code generated. SMTP is not configured, so it was printed to the backend console.",
        "delivery": "console",
    }


@router.post("/reset-password", summary="Reset password with OTP")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    stored = OTP_STORE.get(req.email)

    if not stored:
        raise HTTPException(status_code=400, detail="No verification code requested for this email")

    # Enforce expiry — a code must not stay valid indefinitely
    age = datetime.utcnow() - stored["created_at"]
    if age > timedelta(minutes=OTP_VALIDITY_MINUTES):
        del OTP_STORE[req.email]
        raise HTTPException(
            status_code=400,
            detail=f"Verification code expired after {OTP_VALIDITY_MINUTES} minutes. Request a new one.",
        )

    if stored["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Incorrect verification code")

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    db.commit()

    # Clean up OTP
    del OTP_STORE[req.email]

    return {"message": "Password reset successfully"}


@router.get("/user/{user_id}", summary="Get user profile")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_response(user)


@router.put("/user/{user_id}", summary="Update name and phone")
def update_profile(user_id: int, req: UpdateProfileRequest, db: Session = Depends(get_db)):
    """
    Email is intentionally not editable — it is the login identity and changing
    it would require re-verification.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.name is not None:
        name = req.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        user.name = name

    if req.phone is not None:
        user.phone = req.phone.strip()

    db.commit()
    db.refresh(user)

    return {"message": "Profile updated", "user": user_to_response(user)}


@router.post("/change-password", summary="Change password using the current one")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="This account has no password set (created via an external provider)",
        )

    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    if verify_password(req.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from the current one")

    user.password_hash = hash_password(req.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
