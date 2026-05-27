from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import ollama
import json
import re

app = FastAPI(title="Agri-Sales Tracker API (Pipe Pipeline)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AGENT PROMPTS ---

VISION_PROMPT = """
You are a strict agricultural data extraction API. You are looking at a messy handwritten receipt.

CRITICAL RULES:
1. IGNORE PRE-PRINTED TEXT: Completely ignore "Guineos Maduros", "Guineos Verdes", and "Platanos". Do not extract them.
2. FIND HANDWRITING: Only look for the row physically written in pencil (e.g., "Papaya").
3. LEFT-TO-RIGHT TRANSCRIPT: Read that specific handwritten row like a book, from left to right.
4. PIPED FORMAT: Output the row as a single string separated by the pipe symbol (|).
   Format: "Boxes | Description | Quantity | Price"
   Example: "30 | Papaya | 30 | 14.00"
5. DECIMAL FIX: If you see "14 00/" or similar, write it as "14.00". Do NOT combine numbers from different columns into "30.14".

EXPECTED JSON SCHEMA:
{
  "raw_lines": [
    "string"
  ]
}
"""

TRANSLATOR_PROMPT = """
You are an agricultural translation API. I will give you a JSON object containing farm products in Spanish. 
Translate ONLY the "name" values into English (e.g., "Papaya" -> "Papaya"). 
Keep the exact same JSON structure and numbers. Return ONLY valid JSON.
"""

@app.post("/api/v1/receipts/upload")
async def upload_receipt(file: UploadFile = File(...)):
    image_bytes = await file.read()
    
    # ==========================================
    # LAYER 1: VISION OCR (String Extraction)
    # ==========================================
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
        
    print(f"Layer 1 Output: {raw_lines}")

    # ==========================================
    # LAYER 1.5: PYTHON STRING PARSER
    # ==========================================
    print("Layer 1.5: Python slicing the pipe data...")
    scrubbed_items = []
    
    for line in raw_lines:
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 4:
            try:
                # Extract only the numbers from the strings
                boxes = int(''.join(filter(str.isdigit, parts[0])) or 0)
                name = parts[1]
                qty = int(''.join(filter(str.isdigit, parts[2])) or 0)
                
                # Clean the price string (remove '$', '/', text) keep decimals
                price_str = ''.join(c for c in parts[3] if c.isdigit() or c == '.')
                price = float(price_str) if price_str else 0.0
                
                # Fallback: if quantity is blank, use boxes
                actual_qty = qty if qty > 0 else boxes
                
                if actual_qty > 0 and price > 0:
                    scrubbed_items.append({
                        "name": name,
                        "boxes": boxes,
                        "quantity": actual_qty,
                        "unit_price": price
                    })
            except Exception as e:
                print(f"Failed to parse line: {line} - Error: {e}")
                continue
                
    clean_spanish_data = {"items": scrubbed_items}
    print(f"Layer 1.5 Clean Output: {json.dumps(clean_spanish_data, indent=2)}")

    # ==========================================
    # LAYER 2: TRANSLATOR (Spanish -> English)
    # ==========================================
    print("Layer 2: Translator Engine...")
    if not scrubbed_items:
        english_data = clean_spanish_data
    else:
        try:
            translator_response = ollama.chat(
                model='llama3.1',
                messages=[
                    {'role': 'system', 'content': TRANSLATOR_PROMPT},
                    {'role': 'user', 'content': json.dumps(clean_spanish_data)}
                ],
                format='json'
            )
            english_data = json.loads(translator_response['message']['content'])
        except Exception as e:
            print(f"Layer 2 Failed: {e}")
            english_data = clean_spanish_data
        
    # ==========================================
    # LAYER 3: PYTHON MATH ENGINE
    # ==========================================
    print("Layer 3: Python calculating financials...")
    total_revenue = 0.0
    
    for item in english_data.get('items', []):
        row_total = item.get('quantity', 0) * item.get('unit_price', 0)
        item['total'] = float(row_total)
        total_revenue += row_total
        
    english_data['financials'] = {
        "total_revenue": float(total_revenue),
        "total_expense": 0.0, 
        "net_profit": float(total_revenue)
    }
    
    print("Pipeline Complete. Sending to Frontend.")
    return english_data