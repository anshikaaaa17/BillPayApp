"""Categorize Router — ML categorization endpoint

Training and evaluation are done offline in notebooks/BillPay_Stage2_Training.ipynb.
This router only serves predictions from the saved model.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from ml.categorizer import categorize

router = APIRouter()

class CategorizeRequest(BaseModel):
    biller_name: str

@router.post("/", summary="Categorize a biller name using ML engine")
def categorize_biller(req: CategorizeRequest):
    """
    Core ML endpoint — called by React Native app when user selects a biller.
    Returns category + confidence + method (rule/ml).
    """
    result = categorize(req.biller_name)
    return result
