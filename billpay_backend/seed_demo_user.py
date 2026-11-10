"""
Seed a demo account with REAL database rows 

Why this exists
---------------
This script creates  rows in SQLite for one demo account, so the demo has
populated screens while every other account starts empty .

Every transaction below is categorised by running it through the real ML engine
(ml/categorizer.py), so the stored category / confidence / method values are
genuine model output.

Run from inside billpay_backend/:
    python seed_demo_user.py
"""

import uuid
import bcrypt
from datetime import datetime, timedelta

from models.database import (
    SessionLocal, create_tables,
    User, LinkedBiller, Transaction, WalletTopUp,
)
from ml.categorizer import categorize

DEMO_EMAIL    = "demo@gmail.com"
DEMO_PASSWORD = "Password@123"
DEMO_NAME     = "Demo User"
DEMO_PHONE    = "+65 9000 0000"
START_BALANCE = 150.00

# (biller_code, biller_name, amount, days_ago)
DEMO_PAYMENTS = [
    ("SP_POWER", "SP Power",      87.40,   1),
    ("SINGTEL",  "Singtel",       43.00,   3),
    ("NETFLIX",  "Netflix",       18.90,   5),
    ("DBS_LOAN", "DBS Home Loan", 1200.00, 11),
    ("NTUC_INS", "NTUC Income",   155.00, 15),
    ("PUB_WATER", "PUB Water",    34.20,  18),
]

# (biller_code, account_number, nickname)
DEMO_LINKED = [
    ("SP_POWER",  "1223456789", "Home electricity"),
    ("SINGTEL",   "6598765432", "Mobile"),
]


def main():
    create_tables()
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Demo user already exists (id={existing.id}). Removing old demo data...")
            db.query(Transaction).filter(Transaction.user_id == existing.id).delete()
            db.query(LinkedBiller).filter(LinkedBiller.user_id == existing.id).delete()
            db.query(WalletTopUp).filter(WalletTopUp.user_id == existing.id).delete()
            db.delete(existing)
            db.commit()

        pw_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()
        user = User(
            name=DEMO_NAME,
            email=DEMO_EMAIL,
            password_hash=pw_hash,
            phone=DEMO_PHONE,
            provider="email",
            wallet_balance=START_BALANCE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created demo user id={user.id}  {DEMO_EMAIL} / {DEMO_PASSWORD}")

        for code, acct, nickname in DEMO_LINKED:
            db.add(LinkedBiller(
                user_id=user.id,
                biller_code=code,
                account_number=acct,
                nickname=nickname,
            ))
        db.commit()
        print(f"Linked {len(DEMO_LINKED)} billers")

        db.add(WalletTopUp(
            user_id=user.id,
            amount=START_BALANCE,
            method="paynow",
            status="success",
            reference=f"TOP-{uuid.uuid4().hex[:8].upper()}",
            created_at=datetime.utcnow() - timedelta(days=20),
        ))
        db.commit()

        print("\nCategorising demo payments through the real ML engine:")
        for code, name, amount, days_ago in DEMO_PAYMENTS:
            result = categorize(name)
            db.add(Transaction(
                user_id=user.id,
                biller_code=code,
                biller_name=name,
                amount=amount,
                reference=f"REF-{code}-{uuid.uuid4().hex[:6].upper()}",
                category=result["category"],
                ml_confidence=result["confidence"],
                ml_method=result["method"],
                status="success",
                payment_method="wallet",
                transaction_id=f"TXN-{uuid.uuid4().hex[:10].upper()}",
                created_at=datetime.utcnow() - timedelta(days=days_ago),
            ))
            print(f"  {name:16} SGD {amount:>8.2f}  ->  {result['category']:14} "
                  f"({result['confidence']:.0%} via {result['method']})")

        db.commit()
        total = sum(p[2] for p in DEMO_PAYMENTS)
        print(f"\nDone. {len(DEMO_PAYMENTS)} transactions, SGD {total:.2f} total spend.")
        print(f"Log in as {DEMO_EMAIL} / {DEMO_PASSWORD}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
