"""
seed_knockout_r32.py — Round of 32 matches into the database
Run once locally: python seed_knockout_r32.py
"""

import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host':        os.getenv('DB_HOST'),
    'port':        int(os.getenv('DB_PORT', 3306)),
    'user':        os.getenv('DB_USER'),
    'password':    os.getenv('DB_PASSWORD'),
    'db':          os.getenv('DB_NAME'),
    'charset':     'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'ssl':         {'ca': os.getenv('DB_SSL_CA', 'ca.pem')}
}

# (home_team, away_team, kickoff_time) — UTC. slot = index in the list (0-15)
R32_MATCHES = [
    ('South Africa', 'Canada',        '2026-06-29 19:00:00'),
    ('Brazil',        'Japan',        '2026-06-30 17:00:00'),
    ('Germany',       'Paraguay',     '2026-06-30 20:30:00'),
    ('Netherlands',   'Morocco',      '2026-06-30 01:00:00'),
    ('Ivory Coast',   'Norway',       '2026-06-30 17:00:00'),
    ('France',        'Sweden',       '2026-06-30 21:00:00'),
    ('Mexico',        'Ecuador',      '2026-07-01 01:00:00'),
    ('England',       'Congo DR',     '2026-07-01 16:00:00'),
    ('Belgium',       'Senegal',      '2026-07-01 20:00:00'),
    ('USA',           'Bosnia & Herz.', '2026-07-02 00:00:00'),
    ('Spain',         'Austria',      '2026-07-02 19:00:00'),
    ('Portugal',      'Croatia',      '2026-07-02 23:00:00'),
    ('Switzerland',   'Algeria',      '2026-07-03 03:00:00'),
    ('Australia',     'Egypt',        '2026-07-03 18:00:00'),
    ('Argentina',     'Cabo Verde',   '2026-07-03 22:00:00'),
    ('Colombia',      'Ghana',        '2026-07-04 01:30:00'),
]


def seed():
    conn = pymysql.connect(**DB_CONFIG)
    inserted = 0
    try:
        with conn.cursor() as cur:
            for slot, (home, away, kickoff) in enumerate(R32_MATCHES):
                cur.execute("""
                    INSERT INTO knockout_matches (round, slot, home_team, away_team, kickoff_time)
                    VALUES ('R32', %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        home_team = VALUES(home_team),
                        away_team = VALUES(away_team),
                        kickoff_time = VALUES(kickoff_time)
                """, (slot, home, away, kickoff))
                inserted += 1
        conn.commit()
        print(f"✅ {inserted} Round of 32 matches saved.")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == '__main__':
    seed()
