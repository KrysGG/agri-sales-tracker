import sqlite3
import os

DB_NAME = "agri_sales.db"

def init_database():
    # 1. Create an uploads directory for the physical images
    os.makedirs("uploads", exist_ok=True)

    # 2. Connect to SQLite (this automatically creates the .db file if it doesn't exist)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 3. Create the Transactions Table (The Receipt Header)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_date TEXT,
        total_revenue REAL,
        image_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 4. Create the Items Table (The Individual Produce)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        name TEXT,
        boxes INTEGER,
        quantity INTEGER,
        unit_price REAL,
        total REAL,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
    )
    ''')

    conn.commit()
    conn.close()
    
    print("✅ Success! 'uploads/' directory created.")
    print(f"✅ Success! Database '{DB_NAME}' initialized with 'transactions' and 'items' tables.")

if __name__ == "__main__":
    init_database()
