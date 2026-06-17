"""
seed_matches.py — Clean old entries and insert World Cup 2026 group stage matches into Aiven DB (CET/AT source times)
"""

import os
import pymysql
from dotenv import load_dotenv
from datetime import datetime
import pytz

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "db": os.getenv("DB_NAME"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "ssl": {"ca": os.getenv("DB_SSL_CA", "ca.pem")},
}

# Austria time (your source format)
AT = pytz.timezone("Europe/Vienna")
UTC = pytz.utc


def to_utc(dt_str: str):
    """Convert Austria time -> UTC"""
    local_dt = AT.localize(datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S"))
    return local_dt.astimezone(UTC).strftime("%Y-%m-%d %H:%M:%S")


MATCHES = [
    # ── Group A ──
    ("Mexico", "South Africa", "2026-06-11 21:00:00"),
    ("South Korea", "Czechia", "2026-06-12 04:00:00"),
    ("Mexico", "South Korea", "2026-06-19 03:00:00"),
    ("Czechia", "South Africa", "2026-06-17 20:00:00"),
    ("Mexico", "Czechia", "2026-06-24 03:00:00"),
    ("South Africa", "South Korea", "2026-06-24 03:00:00"),

    # ── Group B ──
    ("Canada", "Bosnia & Herz.", "2026-06-12 21:00:00"),
    ("Qatar", "Switzerland", "2026-06-13 21:00:00"),
    ("Canada", "Qatar", "2026-06-17 23:00:00"),
    ("Switzerland", "Bosnia & Herz.", "2026-06-18 02:00:00"),
    ("Switzerland", "Canada", "2026-06-24 21:00:00"),
    ("Bosnia & Herz.", "Qatar", "2026-06-24 21:00:00"),

    # ── Group C ──
    ("Brazil", "Morocco", "2026-06-14 00:00:00"),
    ("Haiti", "Scotland", "2026-06-14 03:00:00"),
    ("Brazil", "Haiti", "2026-06-18 20:30:00"),
    ("Scotland", "Morocco", "2026-06-19 00:00:00"),
    ("Scotland", "Brazil", "2026-06-25 00:00:00"),
    ("Morocco", "Haiti", "2026-06-25 00:00:00"),

    # ── Group D ──
    ("USA", "Paraguay", "2026-06-13 03:00:00"),
    ("Australia", "Turkey", "2026-06-14 06:00:00"),
    ("USA", "Australia", "2026-06-18 21:00:00"),
    ("Turkey", "Paraguay", "2026-06-20 05:00:00"),
    ("Turkey", "USA", "2026-06-26 04:00:00"),
    ("Paraguay", "Australia", "2026-06-26 04:00:00"),

    # ── Group E ──
    ("Germany", "Curacao", "2026-06-14 19:00:00"),
    ("Ivory Coast", "Ecuador", "2026-06-15 01:00:00"),
    ("Germany", "Ivory Coast", "2026-06-20 22:00:00"),
    ("Ecuador", "Curacao", "2026-06-21 02:00:00"),
    ("Curacao", "Ivory Coast", "2026-06-25 22:00:00"),
    ("Ecuador", "Germany", "2026-06-25 22:00:00"),

    # ── Group F ──
    ("Netherlands", "Japan", "2026-06-14 22:00:00"),
    ("Sweden", "Tunisia", "2026-06-15 04:00:00"),
    ("Netherlands", "Sweden", "2026-06-20 19:00:00"),
    ("Tunisia", "Japan", "2026-06-21 06:00:00"),
    ("Japan", "Sweden", "2026-06-26 01:00:00"),
    ("Tunisia", "Netherlands", "2026-06-26 01:00:00"),

    # ── Group G ──
    ("Iran", "New Zealand", "2026-06-16 03:00:00"),
    ("Belgium", "Egypt", "2026-06-15 21:00:00"),
    ("Belgium", "Iran", "2026-06-21 21:00:00"),
    ("New Zealand", "Egypt", "2026-06-22 03:00:00"),
    ("Egypt", "Iran", "2026-06-27 05:00:00"),
    ("New Zealand", "Belgium", "2026-06-27 05:00:00"),

    # ── Group H ──
    ("Saudi Arabia", "Uruguay", "2026-06-16 00:00:00"),
    ("Spain", "Cabo Verde", "2026-06-15 18:00:00"),
    ("Uruguay", "Cabo Verde", "2026-06-22 00:00:00"),
    ("Spain", "Saudi Arabia", "2026-06-21 18:00:00"),
    ("Cabo Verde", "Saudi Arabia", "2026-06-27 02:00:00"),
    ("Uruguay", "Spain", "2026-06-27 02:00:00"),

    # ── Group I ──
    ("France", "Senegal", "2026-06-16 21:00:00"),
    ("Irak", "Norway", "2026-06-17 00:00:00"),
    ("Norway", "Senegal", "2026-06-23 02:00:00"),
    ("France", "Irak", "2026-06-22 23:00:00"),
    ("Norway", "France", "2026-06-26 21:00:00"),
    ("Senegal", "Irak", "2026-06-26 21:00:00"),

    # ── Group J ──
    ("Argentina", "Algeria", "2026-06-17 03:00:00"),
    ("Austria", "Jordan", "2026-06-17 06:00:00"),
    ("Argentina", "Austria", "2026-06-22 19:00:00"),
    ("Jordan", "Algeria", "2026-06-23 05:00:00"),
    ("Algeria", "Austria", "2026-06-28 04:00:00"),
    ("Jordan", "Argentina", "2026-06-28 04:00:00"),

    # ── Group K ──
    ("Portugal", "Congo DR", "2026-06-17 19:00:00"),
    ("Uzbekistan", "Colombia", "2026-06-18 04:00:00"),
    ("Portugal", "Uzbekistan", "2026-06-23 19:00:00"),
    ("Colombia", "Congo DR", "2026-06-24 04:00:00"),
    ("Colombia", "Portugal", "2026-06-28 01:30:00"),
    ("Congo DR", "Uzbekistan", "2026-06-28 01:30:00"),

    # ── Group L ──
    ("Ghana", "Panama", "2026-06-18 01:00:00"),
    ("England", "Croatia", "2026-06-17 22:00:00"),
    ("England", "Ghana", "2026-06-23 22:00:00"),
    ("Panama", "Croatia", "2026-06-24 01:00:00"),
    ("Panama", "England", "2026-06-27 23:00:00"),
    ("Croatia", "Ghana", "2026-06-27 23:00:00"),
]


def seed():
    conn = pymysql.connect(**DB_CONFIG)
    inserted = 0

    try:
        with conn.cursor() as cur:
            # Disable foreign key checks temporarily to avoid constraint issues during truncate
            cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            # Wipe the old matches data from Aiven
            print("Wiping old test data from Aiven matches table...")
            cur.execute("TRUNCATE TABLE matches;")
            
            # Re-enable foreign key checks
            cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
            # Insert the new, correct matches
            print("Seeding correct World Cup 2026 matches...")
            for home, away, kickoff_at in MATCHES:
                kickoff_utc = to_utc(kickoff_at)

                cur.execute(
                    """
                    INSERT INTO matches (home_team, away_team, kickoff_time)
                    VALUES (%s, %s, %s)
                    """,
                    (home, away, kickoff_utc),
                )
                inserted += 1

        conn.commit()
        print(f"Successfully seeded! Inserted: {inserted} matches.")
    except Exception as e:
        conn.rollback()
        print(f"Error during database operations: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
