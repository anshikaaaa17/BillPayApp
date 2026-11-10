"""
Plaid Open Banking Router
Handles the full Plaid integration flow:
1. Create link token → send to React Native app
2. Receive public token → exchange for access token
3. Fetch transactions → feed into ML engine
4. Fetch account balances → show on home screen
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from models.database import get_db, User
from plaid_service import (
    create_link_token,
    exchange_public_token,
    fetch_transactions,
    fetch_accounts,
    get_sandbox_access_token,
    map_plaid_category,
)
from ml.categorizer import categorize as ml_categorize

router = APIRouter()

# ── In-memory token store (use database in production) ────────────────────────
# In production: store access_token encrypted in your database
# Never expose access_token to the frontend
PLAID_TOKENS: dict = {}  # { user_id: access_token }


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class LinkTokenResponse(BaseModel):
    link_token: str

class ExchangeTokenRequest(BaseModel):
    user_id:      int
    public_token: str

class FetchTransactionsRequest(BaseModel):
    user_id:  int
    days_back: Optional[int] = 90


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/link-token", summary="Step 1: Create Plaid link token")
def create_link(user_id: int, db: Session = Depends(get_db)):
    """
    React Native app calls this first.
    Returns a link_token that opens the Plaid Link bank login UI.

    Flow:
    App → POST /plaid/link-token → gets link_token
    App → opens Plaid Link with link_token
    User → logs into their bank
    Plaid → calls onSuccess with public_token
    App → POST /plaid/exchange with public_token
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        link_token = create_link_token(str(user_id))
        return {"link_token": link_token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plaid error: {str(e)}")


@router.post("/exchange", summary="Step 2: Exchange public token for access token")
def exchange_token(req: ExchangeTokenRequest, db: Session = Depends(get_db)):
    """
    After user completes Plaid Link, the app receives a public_token.
    This endpoint exchanges it for a permanent access_token.
    """
    try:
        access_token = exchange_public_token(req.public_token)
        PLAID_TOKENS[req.user_id] = access_token

        # In production: store encrypted in database
        # user.plaid_access_token = encrypt(access_token)
        # db.commit()

        return {
            "message":        "Bank account connected successfully",
            "bank_connected": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")


@router.get("/transactions/{user_id}", summary="Step 3: Fetch and categorise transactions")
def get_transactions(user_id: int, days_back: int = 90, db: Session = Depends(get_db)):
    """
    Fetches real bank transactions and runs them through
    the ML categorisation engine.

    This is the core academic contribution:
    Real transaction data → ML categorisation → spending insights
    """
    access_token = PLAID_TOKENS.get(user_id)
    if not access_token:
        raise HTTPException(
            status_code=404,
            detail="No bank account connected. Complete Plaid Link first."
        )

    try:
        # Fetch raw transactions from Plaid
        raw_transactions = fetch_transactions(access_token, days_back=days_back)

        # Run each transaction through our ML engine
        categorised = []
        comparable = 0
        correct_predictions = 0

        for txn in raw_transactions:
            if txn.get("pending"):
                continue  # Skip pending transactions

            # Our ML categorisation (uses the transaction text only)
            ml_result = ml_categorize(txn["name"])

            # Plaid's label, converted to our 8 categories by map_plaid_category()
            mapped = txn.get("our_category", "Unknown")

            # Only compare when Plaid's label maps onto one of our categories.
            # Otherwise there is no answer key, so the result is None (not False).
            if mapped != "Unknown":
                match = ml_result["category"] == mapped
                comparable += 1
                correct_predictions += 1 if match else 0
            else:
                match = None

            categorised.append({
                # ── FROM PLAID (data as received, plus our mapping of its label) ──
                "plaid": {
                    "id":              txn["plaid_id"],
                    "name":            txn["name"],
                    "merchant":        txn["merchant"],
                    "amount":          txn["amount"],
                    "date":            txn["date"],
                    "raw_category":    txn.get("plaid_category", []),  # Plaid's own label
                    "mapped_category": mapped,                          # our mapping of it
                },
                # ── FROM OUR MODEL (calculated by BillPay's categorizer) ──
                "model": {
                    "category":   ml_result["category"],
                    "confidence": ml_result["confidence"],
                    "method":     ml_result["method"],
                },
                # ── COMPARISON (model vs Plaid's mapped label) ──
                "comparison": {
                    "comparable": mapped != "Unknown",
                    "match":      match,   # true / false / null (no Plaid label to compare)
                },
            })

        total = len(categorised)
        accuracy = (correct_predictions / comparable) if comparable else None

        return {
            "legend": {
                "plaid":      "Fields received from Plaid (raw_category is Plaid's own label; mapped_category is that label converted to BillPay's 8 categories).",
                "model":      "Fields calculated by BillPay's hybrid categorizer from the transaction text.",
                "comparison": "match is null when Plaid's label does not map onto BillPay's categories (nothing to compare against).",
            },
            "summary": {
                "total":              total,
                "comparable":         comparable,
                "correct":            correct_predictions,
                "coverage":           round(comparable / total, 4) if total else 0,
                "abstained":          sum(1 for t in categorised if t["model"]["method"] == "needs_review"),  # model said "Needs review"; counted as not correct
                "accuracy":           round(accuracy, 4) if accuracy is not None else None,
            },
            "transactions":      categorised,
            "total":             total,
            "ml_accuracy":       round(accuracy, 4) if accuracy is not None else None,
            "days_fetched":      days_back,
            "fetched_at":        datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


@router.get("/accounts/{user_id}", summary="Fetch linked bank account balances")
def get_accounts(user_id: int):
    """Returns bank account balances to show on Home screen"""
    access_token = PLAID_TOKENS.get(user_id)
    if not access_token:
        raise HTTPException(status_code=404, detail="No bank account connected")

    try:
        accounts = fetch_accounts(access_token)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sandbox/connect/{user_id}", summary="Connect sandbox test bank (development only)")
def connect_sandbox(user_id: int):
    """
    Connects a simulated bank account for development/testing.
    No real bank credentials needed.
    Use this during FYP development — switch to real Plaid Link for demo.
    """
    try:
        access_token = get_sandbox_access_token()
        PLAID_TOKENS[user_id] = access_token
        return {
            "message":        "Sandbox bank connected (First Platypus Bank)",
            "bank_connected": True,
            "note":           "This is simulated data for development",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sandbox connection failed: {str(e)}")


@router.get("/status/{user_id}", summary="Check if user has connected a bank")
def check_status(user_id: int):
    connected = user_id in PLAID_TOKENS
    return {
        "bank_connected": connected,
        "message": "Bank account connected" if connected else "No bank account connected",
    }
