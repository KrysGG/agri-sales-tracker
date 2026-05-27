# -*- coding: utf-8 -*-
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import ollama
import json
import sqlite3

app = FastAPI(title="Agri-Sales Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DATABASE INITIALIZATION
# ==========================================
DB_FILE = "agri_sales.db"

def init_db():
    """Creates the SQLite database and tables if they don't exist yet."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Table for the overall receipt summary
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            total_revenue REAL
        )
    ''')
    
    # Table for the individual items on the receipt
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS receipt_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_id INTEGER,
            product_name TEXT,
            boxes INTEGER,
            quantity INTEGER,
            unit_price REAL,
            total REAL,
            FOREIGN KEY(receipt_id) REFERENCES receipts(id)
        )
    ''')
    conn.commit()
    conn.close()

# Run this immediately when the server boots up
init_db()

# ==========================================
# DATA MODELS (For the /save route)
# ==========================================
class ReceiptItem(BaseModel):
    name: str
    boxes: int
    quantity: int
    unit_price: float
    total: float

class Financials(BaseModel):
    total_revenue: float
    total_expense: float
    net_profit: float

class ReceiptPayload(BaseModel):
    date: str
    items: List[ReceiptItem]
    financials: Financials

# ==========================================
# AI PROMPT
# ==========================================
VISION_PROMPT = """
You are a precise agricultural data extraction assistant. 

### TASK:
1. Scan the receipt for product rows within the main table.
2. Only extract rows where there is a value in the 'CANT.' or 'CAJAS' columns.
3. Stop extraction if you encounter a large vertical space indicating the end of the list.

### DATA CONSTRAINTS:
- Use this list of valid products: Guineos Maduros, Guineos Verdes, Platanos, Pina, Papaya, Ninos Guineos, Limones.
- Treat 'CANT.' and 'CAJAS' values as identical.
- Ignore any numeric headers or index numbers located to the left of the product name.

### OUTPUT FORMAT:
- Output a JSON object with a key 'raw_lines'.
- Each item in 'raw_lines' must be a string: "Boxes | Description | Quantity | Price".
- If a field is missing data, leave it blank (e.g., " | Name | | ").
- Example: {"raw_lines": ["25 | Guineos Maduros | 25 | 37", "16 | Guineos Verdes | 16 | 35"]}
"""

# ==========================================
# ROUTE 1: EXTRACT ONLY (No Database)
# ==========================================
@app.post("/api/v1/receipts/upload")
async def extract_receipt(file: UploadFile = File(...)):
    image_bytes = await file.read()
    
    print("Layer 1: Extracting Raw Strings...")
    try:
        vision_response = ollama.chat(
            model='llama3.2-vision',
            messages=[
                {'role': 'system', 'content': VISION_PROMPT},
                {'role': 'user', 'content': 'Extract the handwritten row.', 'images': [image_bytes]}
            ],
            format='json'
        )
        raw_lines = json.loads(vision_response['message']['content']).get('raw_lines', [])
    except Exception as e:
        print(f"Layer 1 Failed: {e}")
        raw_lines = []
        
    print("Layer 1.5: Python slicing the pipe data...")
    scrubbed_items = []
    
    for line in raw_lines:
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 4:
            try:
                boxes = int(''.join(filter(str.isdigit, parts[0])) or 0)
                name = parts[1]
                qty = int(''.join(filter(str.isdigit, parts[2])) or 0)
                price_str = ''.join(c for c in parts[3] if c.isdigit() or c == '.')
                price = float(price_str) if price_str else 0.0
                actual_qty = qty if qty > 0 else boxes
                
                if actual_qty > 0 and price > 0:
                    scrubbed_items.append({
                        "name": name,
                        "boxes": boxes,
                        "quantity": actual_qty,
                        "unit_price": price
                    })
            except Exception as e:
                continue
                
    data = {"items": scrubbed_items}

    print("Layer 3: Python calculating financials...")
    total_revenue = 0.0
    
    for item in data.get('items', []):
        row_total = item.get('quantity', 0) * item.get('unit_price', 0)
        item['total'] = float(row_total)
        total_revenue += row_total
        
    data['financials'] = {
        "total_revenue": float(total_revenue),
        "total_expense": 0.0, 
        "net_profit": float(total_revenue)
    }
    
    print("Extraction Complete. Sending to Frontend for Human Verification.")
    return data

# ==========================================
# ROUTE 2: SAVE VERIFIED DATA TO SQLITE
# ==========================================
@app.post("/api/v1/receipts/save")
async def save_receipt(payload: ReceiptPayload):
    print(f"Saving verified data for date: {payload.date}")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # 1. Save the main receipt entry
        cursor.execute(
            "INSERT INTO receipts (date, total_revenue) VALUES (?, ?)",
            (payload.date, payload.financials.total_revenue)
        )
        receipt_id = cursor.lastrowid # Grabs the ID that SQLite just auto-generated
        
        # 2. Save all the individual items, linking them to the receipt ID
        for item in payload.items:
            cursor.execute(
                """
                INSERT INTO receipt_items 
                (receipt_id, product_name, boxes, quantity, unit_price, total) 
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (receipt_id, item.name, item.boxes, item.quantity, item.unit_price, item.total)
            )
            
        conn.commit()
        return {"status": "success", "message": "Data saved to SQLite successfully!"}
        
    except Exception as e:
        conn.rollback() # If anything fails, undo the whole transaction so we don't get partial data
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()