"""Insights Router — spending analytics and ML accuracy stats"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from models.database import get_db, Transaction

router = APIRouter()


@router.get("/{user_id}/monthly", summary="Spend totals for the last N calendar months")
def get_monthly_spend(user_id: int, months: int = 5, db: Session = Depends(get_db)):
    """
    Returns one entry per calendar month, oldest first, so the app can draw a
    real trend chart instead of hardcoded bars.
    """
    now = datetime.utcnow()
    buckets = []

    for i in range(months - 1, -1, -1):
        # Walk back i months from the current month
        year  = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year  -= 1

        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, month + 1, 1)

        total = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.user_id == user_id,
            Transaction.status == "success",
            Transaction.created_at >= start,
            Transaction.created_at < end,
        ).scalar() or 0.0

        count = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == user_id,
            Transaction.status == "success",
            Transaction.created_at >= start,
            Transaction.created_at < end,
        ).scalar() or 0

        buckets.append({
            "year":   year,
            "month":  month,
            "label":  start.strftime("%b"),
            "total":  round(float(total), 2),
            "count":  int(count),
            "is_current": i == 0,
        })

    # Percentage change of the latest month versus the one before it
    change_pct = None
    if len(buckets) >= 2:
        prev, curr = buckets[-2]["total"], buckets[-1]["total"]
        if prev > 0:
            change_pct = round(((curr - prev) / prev) * 100, 1)

    return {
        "months":        buckets,
        "change_pct":    change_pct,
        "prev_label":    buckets[-2]["label"] if len(buckets) >= 2 else None,
        "current_label": buckets[-1]["label"] if buckets else None,
    }


@router.get("/{user_id}", summary="Get spending insights for user")
def get_insights(user_id: int, months: int = 1, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=30 * months)

    txns = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= since,
        Transaction.status == "success",
    ).all()

    if not txns:
        return {
            "total_spend":      0,
            "num_transactions": 0,
            "by_category":      {},
            "ml_accuracy":      None,
            "period_days":      30 * months,
        }

    # Spend by category
    by_category = {}
    for t in txns:
        cat = t.category or "Unknown"
        by_category[cat] = by_category.get(cat, 0) + t.amount

    total = sum(by_category.values())

    # ML accuracy
    ml_correct = sum(1 for t in txns if t.ml_confidence and t.ml_confidence >= 0.8)
    ml_accuracy = ml_correct / len(txns) if txns else 0

    return {
        "total_spend":   round(total, 2),
        "num_transactions": len(txns),
        "by_category":   {k: round(v, 2) for k, v in sorted(by_category.items(), key=lambda x: -x[1])},
        "ml_accuracy":   round(ml_accuracy, 4),
        "period_days":   30 * months,
    }
