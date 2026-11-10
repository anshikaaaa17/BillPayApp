"""
Database setup using SQLAlchemy with SQLite
As confirmed by Dr Gu Chloe — SQLite is the correct choice for this FYP
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# SQLite — creates billpay.db file automatically in project folder
# No server needed, no configuration, works on all platforms
DATABASE_URL = "sqlite:///./billpay.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Database Models ────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(100), nullable=False)
    email          = Column(String(200), unique=True, index=True, nullable=False)
    password_hash  = Column(String(200))                 # None for Google users
    phone          = Column(String(20))
    provider       = Column(String(20), default="email") # email | google
    wallet_balance = Column(Float, default=0.0)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    transactions   = relationship("Transaction", back_populates="user")
    linked_billers = relationship("LinkedBiller", back_populates="user")


class Biller(Base):
    __tablename__ = "billers"

    id           = Column(Integer, primary_key=True, index=True)
    biller_code  = Column(String(50), unique=True, index=True)  # e.g. SP_POWER
    name         = Column(String(100), nullable=False)           # e.g. SP Power
    category     = Column(String(50), nullable=False)            # e.g. Utilities
    icon         = Column(String(50))                            # Ionicon name
    color        = Column(String(10))                            # hex color


class LinkedBiller(Base):
    """User's linked biller accounts — the 'integrated' part of the app"""
    __tablename__ = "linked_billers"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    biller_code    = Column(String(50))
    account_number = Column(String(100))    # user's account with the biller
    nickname       = Column(String(100))    # e.g. "Home electricity"
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    user           = relationship("User", back_populates="linked_billers")


class Transaction(Base):
    __tablename__ = "transactions"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"))
    biller_code     = Column(String(50))
    biller_name     = Column(String(100))
    amount          = Column(Float, nullable=False)
    reference       = Column(String(100))
    category        = Column(String(50))        # ML output
    ml_confidence   = Column(Float)             # 0.0 to 1.0
    ml_method       = Column(String(20))        # "rule" | "ml" | "manual"
    status          = Column(String(20), default="success")
    payment_method  = Column(String(20), default="wallet")  # wallet | direct
    transaction_id  = Column(String(50), unique=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    user            = relationship("User", back_populates="transactions")


class WalletTopUp(Base):
    __tablename__ = "wallet_topups"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    amount         = Column(Float, nullable=False)
    method         = Column(String(50))         # paynow | card | bank | nets
    status         = Column(String(20), default="success")
    reference      = Column(String(50))
    created_at     = Column(DateTime, default=datetime.utcnow)


class MLLabel(Base):
    """Ground truth labels for ML model training and evaluation"""
    __tablename__ = "ml_labels"

    id           = Column(Integer, primary_key=True, index=True)
    biller_name  = Column(String(100))          # input text
    category     = Column(String(50))           # correct label
    source       = Column(String(20))           # "rule" | "verified" | "plaid"
    created_at   = Column(DateTime, default=datetime.utcnow)


# ── Helper ────────────────────────────────────────────────────────────────────

def get_db():
    """Dependency — provides a database session to each request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables — run once on startup"""
    Base.metadata.create_all(bind=engine)
