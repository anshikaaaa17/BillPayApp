"""
Plaid Open Banking Integration — CCDS26-0127
Supervisor: Dr Gu Chloe (DMAL)

Fixed for plaid-python v40+ which removed Environment enum
"""

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from datetime import date, timedelta
from typing import Optional
import os

# Configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID", "your_client_id_here")
PLAID_SECRET    = os.getenv("PLAID_SECRET",    "your_sandbox_secret_here")
PLAID_ENV       = os.getenv("PLAID_ENV",       "sandbox")

# Fixed: use URL strings instead of Environment enum (v40+ breaking change)
ENVIRONMENTS = {
    "sandbox":     "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production":  "https://production.plaid.com",
}

def get_plaid_client() -> plaid_api.PlaidApi:
    """Create and return a Plaid API client"""
    configuration = plaid.Configuration(
        host=ENVIRONMENTS.get(PLAID_ENV, "https://sandbox.plaid.com"),
        api_key={
            "clientId": PLAID_CLIENT_ID,
            "secret":   PLAID_SECRET,
        }
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def create_link_token(user_id: str) -> str:
    client = get_plaid_client()
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
        client_name="BillPay",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
    )
    response = client.link_token_create(request)
    return response["link_token"]


def exchange_public_token(public_token: str) -> str:
    client = get_plaid_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return response["access_token"]


def fetch_transactions(access_token: str, days_back: int = 90, max_transactions: int = 100) -> list:
    client = get_plaid_client()
    start_date = date.today() - timedelta(days=days_back)
    end_date   = date.today()
    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
        options=TransactionsGetRequestOptions(count=max_transactions, offset=0)
    )
    response = client.transactions_get(request)
    return [format_transaction(t) for t in response["transactions"]]


def format_transaction(plaid_txn) -> dict:
    plaid_category = plaid_txn.get("category", [])
    our_category   = map_plaid_category(plaid_category)
    return {
        "plaid_id":       plaid_txn["transaction_id"],
        "name":           plaid_txn["name"],
        "merchant":       plaid_txn.get("merchant_name") or plaid_txn["name"],
        "amount":         abs(float(plaid_txn["amount"])),
        "date":           str(plaid_txn["date"]),
        "plaid_category": plaid_category,
        "our_category":   our_category,
        "pending":        plaid_txn.get("pending", False),
    }


def map_plaid_category(plaid_cats: list) -> str:
    if not plaid_cats:
        return "Unknown"
    primary   = plaid_cats[0].lower() if plaid_cats else ""
    secondary = plaid_cats[1].lower() if len(plaid_cats) > 1 else ""
    mapping = {
        "bills and utilities":        "Utilities",
        "utilities":                  "Utilities",
        "phone":                      "Telecoms",
        "telecommunication services": "Telecoms",
        "internet":                   "Telecoms",
        "financial":                  "Finance",
        "banks":                      "Finance",
        "insurance":                  "Insurance",
        "rent":                       "Housing",
        "mortgage":                   "Housing",
        "housing":                    "Housing",
        "entertainment":              "Entertainment",
        "video streaming":            "Entertainment",
        "music streaming":            "Entertainment",
        "education":                  "Education",
        "tuition":                    "Education",
        "transportation":             "Transport",
        "public transportation":      "Transport",
        "taxi":                       "Transport",
        "food and drink":             "Food & Dining",
        "restaurants":                "Food & Dining",
        "fast food":                  "Food & Dining",
        # "taxi" (Transport) is checked earlier, so Uber/Lyft stay Transport
        "airlines":                   "Travel",
        "lodging":                    "Travel",
        "hotels":                     "Travel",
        "travel":                     "Travel",
    }
    for key, category in mapping.items():
        if key in primary or key in secondary:
            return category
    return "Unknown"


def fetch_accounts(access_token: str) -> list:
    client = get_plaid_client()
    request = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(request)
    return [{
        "account_id": acc["account_id"],
        "name":       acc["name"],
        "type":       str(acc["type"]),
        "balance":    acc["balances"]["current"],
        "currency":   acc["balances"].get("iso_currency_code", "SGD"),
        "mask":       acc.get("mask", "****"),
    } for acc in response["accounts"]]


def get_sandbox_access_token() -> str:
    from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
    client = get_plaid_client()
    request = SandboxPublicTokenCreateRequest(
        institution_id="ins_109508",
        initial_products=[Products("transactions")],
    )
    response = client.sandbox_public_token_create(request)
    return exchange_public_token(response["public_token"])