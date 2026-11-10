"""
Payments Router — process bill payments and wallet top ups
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid, asyncio, random
from datetime import datetime

from models.database import get_db, Transaction, User, WalletTopUp
from ml.categorizer import categorize as ml_categorize

router = APIRouter()

class PaymentRequest(BaseModel):
    user_id:        int
    biller_code:    str
    biller_name:    str
    amount:         float
    reference:      str
    payment_method: Optional[str] = "direct"  # wallet | direct

class TopUpRequest(BaseModel):
    user_id: int
    amount:  float
    method:  str  # paynow | card | bank | nets


async def call_mock_gateway(biller_code: str, amount: float, reference: str) -> dict:
    """Simulates calling the biller's payment endpoint"""
    await asyncio.sleep(random.uniform(0.3, 1.0))  # Simulate network latency
    if random.random() < 0.05:                      # 5% gateway failure rate
        raise Exception("Gateway timeout — please retry")
    if amount <= 0 or amount > 10000:
        raise Exception("Invalid amount")
    return {
        "gateway_txn_id": f"GW-{uuid.uuid4().hex[:8].upper()}",
        "status":         "success",
        "timestamp":      datetime.utcnow().isoformat(),
    }


@router.post("/pay", summary="Process a bill payment")
async def pay_bill(req: PaymentRequest, db: Session = Depends(get_db)):
    # Validate user
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Wallet payment — check balance
    if req.payment_method == "wallet":
        if user.wallet_balance < req.amount:
            raise HTTPException(status_code=400, detail=f"Insufficient wallet balance (SGD {user.wallet_balance:.2f})")

    # Categorize using ML engine
    cat_result = ml_categorize(req.biller_name)

    # Call mock payment gateway
    try:
        gateway = await call_mock_gateway(req.biller_code, req.amount, req.reference)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Deduct from wallet if wallet payment
    if req.payment_method == "wallet":
        user.wallet_balance = round(user.wallet_balance - req.amount, 2)

    # Save transaction
    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    txn = Transaction(
        user_id        = req.user_id,
        biller_code    = req.biller_code,
        biller_name    = req.biller_name,
        amount         = req.amount,
        reference      = req.reference,
        category       = cat_result["category"],
        ml_confidence  = cat_result["confidence"],
        ml_method      = cat_result["method"],
        status         = "success",
        payment_method = req.payment_method,
        transaction_id = txn_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return {
        "transaction_id":  txn_id,
        "gateway_txn_id":  gateway["gateway_txn_id"],
        "status":          "success",
        "biller_name":     req.biller_name,
        "amount":          req.amount,
        "category":        cat_result["category"],
        "ml_confidence":   cat_result["confidence"],
        "ml_method":       cat_result["method"],
        "wallet_balance":  user.wallet_balance,
        "timestamp":       gateway["timestamp"],
    }


@router.post("/topup", summary="Top up wallet balance")
async def top_up(req: TopUpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.amount <= 0 or req.amount > 2000:
        raise HTTPException(status_code=400, detail="Amount must be between SGD 1 and SGD 2,000")

    await asyncio.sleep(0.5)  # Simulate payment processing

    user.wallet_balance = round(user.wallet_balance + req.amount, 2)

    topup = WalletTopUp(
        user_id   = req.user_id,
        amount    = req.amount,
        method    = req.method,
        status    = "success",
        reference = f"TU-{uuid.uuid4().hex[:8].upper()}",
    )
    db.add(topup)
    db.commit()

    return {
        "status":          "success",
        "amount_added":    req.amount,
        "new_balance":     user.wallet_balance,
        "method":          req.method,
    }


@router.get("/history/{user_id}", summary="Get transaction history")
def get_history(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    txns = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()

    return [{
        "id":             t.id,
        "transaction_id": t.transaction_id,
        "biller_name":    t.biller_name,
        "biller_code":    t.biller_code,
        "amount":         t.amount,
        "category":       t.category,
        "ml_confidence":  t.ml_confidence,
        "ml_method":      t.ml_method,
        "status":         t.status,
        "date":           t.created_at.strftime("%d %b %Y"),
        "created_at":     t.created_at.isoformat(),
    } for t in txns]
