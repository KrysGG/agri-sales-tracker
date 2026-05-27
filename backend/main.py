from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Agri-Sales Tracker API")

# This allows the React frontend to communicate with your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you would change this to the frontend's actual URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/receipts/upload")
async def upload_receipt():
    """
    Mock endpoint for Phase 1. 
    Simulates the AI processing an image and returning structured JSON data.
    """
    return {
        "transaction_id": "tx_20260526_001",
        "timestamp": "2026-05-26T20:57:00Z",
        "items": [
            {"name": "N-P-K 10-20-20 Fertilizer", "category": "expense", "total": 225.00},
            {"name": "Hass Avocado Yield Sales", "category": "revenue", "total": 600.00}
        ],
        "financials": {
            "total_revenue": 600.00,
            "total_expense": 225.00,
            "net_profit": 375.00
        }
    }