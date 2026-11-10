"""
BillPayApp — FastAPI Backend
CCDS26-0127 | Anshika Uppal | Supervisor: Dr Gu Chloe
Run with:
    uvicorn main:app --reload --port 8000
API docs:
    http://localhost:8000/docs
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, bills, payments, categorize, insights
from plaid_router import router as plaid_router

app = FastAPI(
    title="BillPay API",
    description="Integrated Bill Payment App with Smart Categorization — CCDS26-0127",
    version="1.0.0",
)

# Allow React Native app to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(auth.router,       prefix="/auth",      tags=["Authentication"])
app.include_router(bills.router,      prefix="/bills",     tags=["Bills"])
app.include_router(payments.router,   prefix="/payments",  tags=["Payments"])
app.include_router(categorize.router, prefix="/categorize",tags=["ML Categorization"])
app.include_router(insights.router,   prefix="/insights",  tags=["Insights"])
app.include_router(plaid_router,      prefix="/plaid",     tags=["Open Banking"])

@app.get("/")
def root():
    return {
        "app": "BillPay API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "healthy"}