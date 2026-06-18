"""
add_indexes.py — DB Indexes hinzufügen für schnellere Queries
Einmal lokal ausführen: python add_indexes.py
"""

import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    db=os.getenv('DB_NAME'),
    charset='utf8mb4',
    ssl={'ca': os.getenv('DB_SSL_CA', 'ca.pem')}
)

indexes = [
    ("idx_predictions_user_id",  "ALTER TABLE predictions ADD INDEX idx_predictions_user_id (user_id)"),
    ("idx_predictions_match_id", "ALTER TABLE predictions ADD INDEX idx_predictions_match_id (match_id)"),
    ("idx_users_email",          "ALTER TABLE users ADD INDEX idx_users_email (email)"),
]

with conn.cursor() as cur:
    for name, sql in indexes:
        try:
            cur.execute(sql)
            print(f"✅ Index {name} added.")
        except Exception as e:
            if 'Duplicate key name' in str(e):
                print(f"⏭ Index {name} already exists.")
            else:
                print(f"❌ Error at {name}: {e}")

conn.commit()
conn.close()
print("Done.")