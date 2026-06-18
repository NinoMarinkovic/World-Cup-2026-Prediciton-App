import pymysql, os
from dotenv import load_dotenv
load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST'), port=int(os.getenv('DB_PORT')),
    user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'),
    db=os.getenv('DB_NAME'), ssl={'ca': os.getenv('DB_SSL_CA')}
)
with conn.cursor() as cur:
    cur.execute("UPDATE users SET is_admin=1 WHERE email=%s", ('nimarinkovic2009@gmail.com'))
conn.commit()
conn.close()
print("Done")