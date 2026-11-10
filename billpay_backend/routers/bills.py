"""
Bills Router — fully integrated with database
- GET /bills/all          → all billers from database
- GET /bills/linked/{id}  → user's linked billers
- POST /bills/link        → link a biller account
- GET /bills/outstanding/{id} → fetch live amounts from mock biller APIs
- DELETE /bills/unlink/{id}   → remove linked biller
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import asyncio, random
from datetime import datetime, timedelta
from models.database import get_db, LinkedBiller, Biller, User

router = APIRouter()

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class LinkBillerRequest(BaseModel):
    user_id:        int
    biller_code:    str
    account_number: str
    nickname:       Optional[str] = None

# ── Mock biller API ───────────────────────────────────────────────────────────
async def fetch_outstanding_from_biller(biller_code: str, account_number: str, biller: Biller) -> dict:
    """
    Simulates calling a real biller's API.
    In production: replace with real HTTP calls to SP Group, Singtel etc.
    """
    await asyncio.sleep(random.uniform(0.1, 0.4))

    # 2% chance of fetch failure (realistic)
    if random.random() < 0.02:
        raise Exception(f"Could not reach {biller.name} API")

    # Realistic amount ranges per category
    ranges = {
        "Utilities":     (40,  200),
        "Telecoms":      (30,  120),
        "Housing":       (800, 2500),
        "Finance":       (200, 3000),
        "Insurance":     (80,  500),
        "Entertainment": (10,  50),
        "Education":     (500, 5000),
        "Transport":     (20,  100),
        "Food & Dining": (5,   60),
        "Travel":        (150, 1500),
    }
    lo, hi    = ranges.get(biller.category, (50, 200))
    amount    = round(random.uniform(lo, hi), 2)
    due_days  = random.randint(2, 21)
    due_date  = (datetime.utcnow() + timedelta(days=due_days)).strftime("%d %b %Y")

    return {
        "biller_code":    biller_code,
        "biller_name":    biller.name,
        "biller_category":biller.category,
        "biller_icon":    biller.icon,
        "biller_color":   biller.color,
        "account_number": account_number[:4] + "****",
        "amount":         amount,
        "due_date":       due_date,
        "due_in_days":    due_days,
        "status":         "outstanding",
        "fetched_at":     datetime.utcnow().isoformat(),
    }

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/all")
def get_all_billers(db: Session = Depends(get_db)):
    """Returns all billers from database — shown in Link Biller screen"""
    billers = db.query(Biller).all()
    return [{
        "id":           b.id,
        "biller_code":  b.biller_code,
        "name":         b.name,
        "category":     b.category,
        "icon":         b.icon,
        "color":        b.color,
    } for b in billers]


@router.get("/linked/{user_id}")
def get_linked_billers(user_id: int, db: Session = Depends(get_db)):
    """Returns all billers linked to this user"""
    linked = db.query(LinkedBiller).filter(
        LinkedBiller.user_id  == user_id,
        LinkedBiller.is_active == True,
    ).all()

    result = []
    for lb in linked:
        biller = db.query(Biller).filter(Biller.biller_code == lb.biller_code).first()
        result.append({
            "id":             lb.id,
            "biller_code":    lb.biller_code,
            "name":           biller.name if biller else lb.biller_code,
            "category":       biller.category if biller else "Unknown",
            "icon":           biller.icon if biller else "receipt",
            "color":          biller.color if biller else "#6B7280",
            "account_number": lb.account_number[:4] + "****",
            "nickname":       lb.nickname,
            "linked_at":      lb.created_at.isoformat() if lb.created_at else "",
        })
    return result


@router.post("/link")
def link_biller(req: LinkBillerRequest, db: Session = Depends(get_db)):
    """User links their account number to a biller — done once"""
    # Validate user exists
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate biller exists in our directory
    biller = db.query(Biller).filter(Biller.biller_code == req.biller_code).first()
    if not biller:
        raise HTTPException(status_code=404, detail="Biller not found in directory")

    # Check not already linked
    existing = db.query(LinkedBiller).filter(
        LinkedBiller.user_id     == req.user_id,
        LinkedBiller.biller_code == req.biller_code,
        LinkedBiller.is_active   == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"You have already linked {biller.name}")

    # Create link
    linked = LinkedBiller(
        user_id        = req.user_id,
        biller_code    = req.biller_code,
        account_number = req.account_number,
        nickname       = req.nickname or biller.name,
    )
    db.add(linked)
    db.commit()
    db.refresh(linked)

    return {
        "message":      f"{biller.name} linked successfully",
        "linked_id":    linked.id,
        "biller_name":  biller.name,
        "category":     biller.category,
    }


@router.delete("/unlink/{linked_id}")
def unlink_biller(linked_id: int, user_id: int, db: Session = Depends(get_db)):
    """Remove a linked biller"""
    linked = db.query(LinkedBiller).filter(
        LinkedBiller.id      == linked_id,
        LinkedBiller.user_id == user_id,
    ).first()
    if not linked:
        raise HTTPException(status_code=404, detail="Linked biller not found")
    linked.is_active = False
    db.commit()
    return {"message": "Biller unlinked successfully"}


@router.get("/outstanding/{user_id}")
async def get_outstanding_bills(user_id: int, db: Session = Depends(get_db)):
    """
    Core integration endpoint.
    For each linked biller, calls mock biller API to get outstanding amount.
    This is what makes the app truly 'integrated'.
    """
    linked = db.query(LinkedBiller).filter(
        LinkedBiller.user_id  == user_id,
        LinkedBiller.is_active == True,
    ).all()

    if not linked:
        return {
            "bills":   [],
            "message": "No billers linked. Go to Pay > Link Biller to add your accounts.",
            "count":   0,
        }

    bills = []
    for lb in linked:
        biller = db.query(Biller).filter(Biller.biller_code == lb.biller_code).first()
        if not biller:
            continue
        try:
            bill = await fetch_outstanding_from_biller(lb.biller_code, lb.account_number, biller)
            bill["nickname"]  = lb.nickname or biller.name
            bill["linked_id"] = lb.id
            bills.append(bill)
        except Exception as e:
            bills.append({
                "biller_code":  lb.biller_code,
                "biller_name":  biller.name,
                "nickname":     lb.nickname or biller.name,
                "error":        str(e),
                "status":       "fetch_failed",
                "linked_id":    lb.id,
            })

    # Sort by due date soonest first
    bills.sort(key=lambda x: x.get("due_in_days", 999))

    return {
        "bills": bills,
        "count": len(bills),
    }
