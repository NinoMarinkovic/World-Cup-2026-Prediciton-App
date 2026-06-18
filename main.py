import bcrypt
import re
import os
import tempfile
from datetime import datetime
from dotenv import load_dotenv
import pymysql
from flask import Flask, request, jsonify, session, render_template, redirect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException

load_dotenv()

ca_cert = os.getenv('DB_SSL_CA')
if ca_cert and not os.path.isfile(ca_cert):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pem', mode='w')
    tmp.write(ca_cert)
    tmp.close()
    os.environ['DB_SSL_CA'] = tmp.name

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback_secret_key')

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://"
)

DB_CONFIG = {
    'host':        os.getenv('DB_HOST'),
    'port':        int(os.getenv('DB_PORT', 3306)),
    'user':        os.getenv('DB_USER'),
    'password':    os.getenv('DB_PASSWORD'),
    'db':          os.getenv('DB_NAME'),
    'charset':     'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'ssl':         {'ca': os.getenv('DB_SSL_CA')}
}

def get_db():
    return pymysql.connect(**DB_CONFIG)


def init_db():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(100) NOT NULL,
                    email VARCHAR(150) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    is_admin TINYINT(1) DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS matches (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    home_team VARCHAR(100) NOT NULL,
                    away_team VARCHAR(100) NOT NULL,
                    kickoff_time DATETIME NOT NULL,
                    home_score INT DEFAULT NULL,
                    away_score INT DEFAULT NULL,
                    finished BOOLEAN DEFAULT FALSE
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    match_id INT NOT NULL,
                    pred_home INT NOT NULL,
                    pred_away INT NOT NULL,
                    points INT DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_prediction (user_id, match_id)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS knockout_matches (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    round VARCHAR(50) NOT NULL,
                    slot INT NOT NULL,
                    home_team VARCHAR(100) DEFAULT NULL,
                    away_team VARCHAR(100) DEFAULT NULL,
                    kickoff_time DATETIME DEFAULT NULL,
                    home_score INT DEFAULT NULL,
                    away_score INT DEFAULT NULL,
                    home_penalties INT DEFAULT NULL,
                    away_penalties INT DEFAULT NULL,
                    finished BOOLEAN DEFAULT FALSE,
                    UNIQUE KEY unique_slot (round, slot)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS knockout_predictions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    knockout_match_id INT NOT NULL,
                    pred_home INT NOT NULL,
                    pred_away INT NOT NULL,
                    pred_winner VARCHAR(100) DEFAULT NULL,
                    points INT DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (knockout_match_id) REFERENCES knockout_matches(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_ko_prediction (user_id, knockout_match_id)
                )
            """)
        conn.commit()
    finally:
        conn.close()


# ══════════════════════════════════════════
# Validation
# ══════════════════════════════════════════

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    reg = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%])[A-Za-z\d@$#%]{6,20}$"
    return re.search(reg, password) is not None


# ══════════════════════════════════════════
# Security
# ══════════════════════════════════════════

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(stored_hash, password):
    return bcrypt.checkpw(password.encode(), stored_hash.encode())

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/')
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify(error='Unauthorized'), 401
        if not session.get('is_admin'):
            return jsonify(error='Forbidden. Admin only.'), 403
        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════
# Error Handlers
# ══════════════════════════════════════════

@app.errorhandler(404)
def not_found(e):
    return jsonify(error='Not found.'), 404

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify(error='Too many requests. Please slow down.'), 429

@app.errorhandler(Exception)
def handle_error(e):
    if isinstance(e, HTTPException):
        return jsonify(error=e.description), e.code
    return jsonify(error='Something went wrong.'), 500


# ══════════════════════════════════════════
# Flask Routes – Seiten
# ══════════════════════════════════════════

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/matches')
@login_required
def matches():
    return render_template('matches.html', username=session['user_name'])

@app.route('/leaderboard')
@login_required
def leaderboard():
    return render_template('leaderboard.html', username=session['user_name'])

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', username=session['user_name'])


# ══════════════════════════════════════════
# Flask Routes – API
# ══════════════════════════════════════════

@app.route('/api/me')
def api_me():
    if 'user_id' not in session:
        return jsonify(error='Unauthorized'), 401
    return jsonify(username=session['user_name'])


@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per minute")
def api_register():
    data     = request.json
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not name:
        return jsonify(error='Please enter your full name.'), 400
    if len(name) < 3 or len(name) > 30:
        return jsonify(error='Username must be between 3 and 30 characters.'), 400
    if not validate_email(email):
        return jsonify(error='Invalid email address.'), 400
    if not validate_password(password):
        return jsonify(error='Password does not meet the requirements.'), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return jsonify(error='An account with this email already exists.'), 400
            cur.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, hash_password(password))
            )
        conn.commit()
    finally:
        conn.close()

    return jsonify(message='Account created successfully.'), 201


@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def api_login():
    data     = request.json
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
    finally:
        conn.close()

    if not user:
        return jsonify(error='No account found for this email.'), 404

    attempts_key = f'attempts_{email}'
    attempts = session.get(attempts_key, 0)

    if attempts >= 3:
        return jsonify(error='Account locked. Too many failed attempts.', locked=True), 403

    if not verify_password(user['password_hash'], password):
        session[attempts_key] = attempts + 1
        remaining = 3 - session[attempts_key]
        if remaining <= 0:
            return jsonify(error='Account locked.', locked=True, remaining=0), 403
        return jsonify(error='Incorrect password.', remaining=remaining), 401

    session[attempts_key] = 0
    session['user_id']   = user['id']
    session['user_name'] = user['username']
    session['is_admin']  = bool(user['is_admin'])

    return jsonify(message='Login successful.', username=user['username'])


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify(message='Logged out.'), 200


def get_current_user_id():
    return session.get('user_id')


@app.route('/api/predictions', methods=['POST'])
def api_submit_prediction():
    if 'user_id' not in session:
        return jsonify(error='Unauthorized'), 401

    data = request.json
    match_id  = data.get('match_id')
    pred_home = data.get('pred_home')
    pred_away = data.get('pred_away')

    if not all(isinstance(x, int) for x in [match_id, pred_home, pred_away]):
        return jsonify(error='Invalid input. Match ID and predictions must be integers.'), 400

    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM matches WHERE id = %s", (match_id,))
            match = cur.fetchone()
            if not match:
                return jsonify(error='Match not found.'), 404
            if match['finished']:
                return jsonify(error='Cannot predict on finished matches.'), 400
            if datetime.now() >= match['kickoff_time']:
                return jsonify(error='Predictions are closed for this match.'), 400

            try:
                cur.execute("""
                    INSERT INTO predictions (user_id, match_id, pred_home, pred_away)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, match_id, pred_home, pred_away))
            except pymysql.err.IntegrityError:
                return jsonify(error='You have already submitted a prediction for this match.'), 400

        conn.commit()
    finally:
        conn.close()

    return jsonify(message='Prediction submitted successfully.'), 200


@app.route('/api/matches', methods=['GET'])
def api_get_matches():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM matches ORDER BY kickoff_time ASC")
            matches = cur.fetchall()
    finally:
        conn.close()

    return jsonify(matches=matches), 200


@app.route('/api/matches', methods=['POST'])
@admin_required
def api_add_match():
    data         = request.json
    home_team    = (data.get('home_team') or '').strip()
    away_team    = (data.get('away_team') or '').strip()
    kickoff_time = (data.get('kickoff_time') or '').strip()

    if not home_team or not away_team or not kickoff_time:
        return jsonify(error='home_team, away_team and kickoff_time are required.'), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO matches (home_team, away_team, kickoff_time)
                VALUES (%s, %s, %s)
            """, (home_team, away_team, kickoff_time))
        conn.commit()
    finally:
        conn.close()

    return jsonify(message='Match added successfully.'), 201


@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.username, COALESCE(SUM(p.points), 0) AS total_points
                FROM users u
                LEFT JOIN predictions p ON u.id = p.user_id
                GROUP BY u.id
                ORDER BY total_points DESC, u.username ASC
            """)
            leaderboard = cur.fetchall()
    finally:
        conn.close()

    return jsonify(leaderboard=leaderboard), 200

@app.route('/api/profile/', methods=['GET'])
@login_required
def api_profile():
    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COALESCE(SUM(points), 0) AS total_points,
                    COUNT(*) AS total_predictions,
                    SUM(points = 3) AS exact_score_count,
                    SUM(points = 1) AS correct_tendency_count
                FROM predictions
                WHERE user_id = %s
            """, (user_id,))
            profile_stats = cur.fetchone()
    finally:
        conn.close()

    total_points = int(profile_stats['total_points'] or 0)
    total_predictions = int(profile_stats['total_predictions'] or 0)
    exact_score_count = int(profile_stats['exact_score_count'] or 0)
    correct_tendency_count = int(profile_stats['correct_tendency_count'] or 0)
    accuracy = 0.0
    if total_predictions > 0:
        accuracy = round((exact_score_count / total_predictions) * 100, 2)

    return jsonify(
        username=session['user_name'],
        total_points=total_points,
        total_predictions=total_predictions,
        exact_score_count=exact_score_count,
        correct_tendency_count=correct_tendency_count,
        accuracy=accuracy
    ), 200

@app.route('/api/stats', methods=['GET'])
@login_required
def api_stats():
    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Most predicted team
            cur.execute("""
                SELECT home_team AS team, COUNT(*) AS count
                FROM predictions p
                JOIN matches m ON p.match_id = m.id
                WHERE p.user_id = %s
                GROUP BY home_team
                UNION ALL
                SELECT away_team AS team, COUNT(*) AS count
                FROM predictions p
                JOIN matches m ON p.match_id = m.id
                WHERE p.user_id = %s
                GROUP BY away_team
            """, (user_id, user_id))
            team_counts = cur.fetchall()
            
            most_predicted_team = 'Portugal'
            if team_counts:
                team_dict = {}
                for row in team_counts:
                    team = row['team']
                    team_dict[team] = team_dict.get(team, 0) + row['count']
                most_predicted_team = max(team_dict, key=team_dict.get)
                # Override favourite team to Portugal for display
                most_predicted_team = 'Portugal'

            # Total scores
            cur.execute("""
                SELECT
                    SUM(points = 3) AS total_exact_scores,
                    SUM(points = 1) AS total_correct_tendency
                FROM predictions
                WHERE user_id = %s
            """, (user_id,))
            scores = cur.fetchone()
    finally:
        conn.close()

    total_exact_scores = int(scores['total_exact_scores'] or 0)
    total_correct_tendency = int(scores['total_correct_tendency'] or 0)

    return jsonify(
        most_predicted_team=most_predicted_team,
        best_round='Group Stage',
        total_exact_scores=total_exact_scores,
        total_correct_tendency=total_correct_tendency
    ), 200

@app.route('/api/pointshistory', methods=['GET'])
@login_required
def api_pointshistory():
    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    p.match_id,
                    p.points,
                    p.created_at,
                    m.home_team,
                    m.away_team
                FROM predictions p
                JOIN matches m ON p.match_id = m.id
                WHERE p.user_id = %s AND m.finished = TRUE
                ORDER BY p.created_at ASC
            """, (user_id,))
            predictions = cur.fetchall()
    finally:
        conn.close()

    # Calculate cumulative points
    cumulative = 0
    for pred in predictions:
        cumulative += pred['points']
        pred['cumulative_points'] = cumulative

    return jsonify(history=predictions), 200

@app.route('/admin')
@login_required
def admin():
    if not session.get('is_admin'):
        return redirect('/')
    return render_template('admin.html')


@app.route('/api/results', methods=['POST'])
@admin_required
def api_submit_results():
    data = request.json
    match_id   = data.get('match_id')
    home_score = data.get('home_score')
    away_score = data.get('away_score')

    if not all(isinstance(x, int) for x in [match_id, home_score, away_score]):
        return jsonify(error='Invalid input. Match ID and scores must be integers.'), 400


    


    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM matches WHERE id = %s", (match_id,))
            match = cur.fetchone()
            if not match:
                return jsonify(error='Match not found.'), 404
            if match['finished']:
                return jsonify(error='Results already submitted for this match.'), 400

            cur.execute("""
                UPDATE matches
                SET home_score = %s, away_score = %s, finished = TRUE
                WHERE id = %s
            """, (home_score, away_score, match_id))

            cur.execute("""
                UPDATE predictions
                SET points =
                    CASE
                        WHEN pred_home = %s AND pred_away = %s THEN 3
                        WHEN (pred_home > pred_away AND %s > %s)
                          OR (pred_home < pred_away AND %s < %s)
                          OR (pred_home = pred_away AND %s = %s) THEN 1
                        ELSE 0
                    END
                WHERE match_id = %s
            """, (home_score, away_score,
                  home_score, away_score,
                  home_score, away_score,
                  home_score, away_score,
                  match_id))

        conn.commit()
        return jsonify(message='Results submitted and points updated successfully.'), 200
    finally:
        conn.close()


# ══════════════════════════════════════════
# Start
# ══════════════════════════════════════════


# ══════════════════════════════════════════
# Knockout – Seite
# ══════════════════════════════════════════

@app.route('/bracket')
@login_required
def bracket():
    return render_template('bracket.html', username=session['user_name'])


# ══════════════════════════════════════════
# Knockout – API
# ══════════════════════════════════════════

@app.route('/api/knockout/matches', methods=['GET'])
@login_required
def api_get_knockout_matches():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM knockout_matches ORDER BY FIELD(round,'R16','QF','SF','F'), slot ASC")
            matches = cur.fetchall()
    finally:
        conn.close()
    return jsonify(matches=matches), 200


@app.route('/api/knockout/matches', methods=['POST'])
@admin_required
def api_add_knockout_match():
    data      = request.json
    round_    = (data.get('round') or '').strip().upper()
    slot      = data.get('slot')
    home_team = (data.get('home_team') or '').strip()
    away_team = (data.get('away_team') or '').strip()
    kickoff   = (data.get('kickoff_time') or '').strip()

    if round_ not in ('R16', 'QF', 'SF', 'F'):
        return jsonify(error='round must be R16, QF, SF or F.'), 400
    if not isinstance(slot, int):
        return jsonify(error='slot must be an integer.'), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO knockout_matches (round, slot, home_team, away_team, kickoff_time)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    home_team = VALUES(home_team),
                    away_team = VALUES(away_team),
                    kickoff_time = VALUES(kickoff_time)
            """, (round_, slot, home_team or None, away_team or None, kickoff or None))
        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Knockout match saved.'), 201


@app.route('/api/knockout/predictions', methods=['POST'])
@login_required
def api_submit_knockout_prediction():
    data              = request.json
    knockout_match_id = data.get('knockout_match_id')
    pred_home         = data.get('pred_home')
    pred_away         = data.get('pred_away')
    pred_winner       = (data.get('pred_winner') or '').strip() or None

    if not all(isinstance(x, int) for x in [knockout_match_id, pred_home, pred_away]):
        return jsonify(error='Invalid input.'), 400

    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM knockout_matches WHERE id = %s", (knockout_match_id,))
            match = cur.fetchone()
            if not match:
                return jsonify(error='Match not found.'), 404
            if match['finished']:
                return jsonify(error='Match already finished.'), 400
            if match['kickoff_time'] and datetime.now() >= match['kickoff_time']:
                return jsonify(error='Predictions are closed for this match.'), 400

            try:
                cur.execute("""
                    INSERT INTO knockout_predictions (user_id, knockout_match_id, pred_home, pred_away, pred_winner)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        pred_home = VALUES(pred_home),
                        pred_away = VALUES(pred_away),
                        pred_winner = VALUES(pred_winner)
                """, (user_id, knockout_match_id, pred_home, pred_away, pred_winner))
            except pymysql.err.IntegrityError:
                return jsonify(error='Prediction error.'), 400

        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Prediction saved.'), 200


@app.route('/api/knockout/predictions', methods=['GET'])
@login_required
def api_get_my_knockout_predictions():
    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT kp.*, km.round, km.slot, km.home_team, km.away_team
                FROM knockout_predictions kp
                JOIN knockout_matches km ON kp.knockout_match_id = km.id
                WHERE kp.user_id = %s
            """, (user_id,))
            preds = cur.fetchall()
    finally:
        conn.close()
    return jsonify(predictions=preds), 200


@app.route('/api/knockout/results', methods=['POST'])
@admin_required
def api_submit_knockout_results():
    data              = request.json
    knockout_match_id = data.get('knockout_match_id')
    home_score        = data.get('home_score')
    away_score        = data.get('away_score')
    home_penalties    = data.get('home_penalties')
    away_penalties    = data.get('away_penalties')
    winner            = (data.get('winner') or '').strip() or None

    if not all(isinstance(x, int) for x in [knockout_match_id, home_score, away_score]):
        return jsonify(error='Invalid input.'), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM knockout_matches WHERE id = %s", (knockout_match_id,))
            match = cur.fetchone()
            if not match:
                return jsonify(error='Match not found.'), 404
            if match['finished']:
                return jsonify(error='Results already submitted.'), 400

            cur.execute("""
                UPDATE knockout_matches
                SET home_score=%s, away_score=%s,
                    home_penalties=%s, away_penalties=%s,
                    finished=TRUE
                WHERE id=%s
            """, (home_score, away_score, home_penalties, away_penalties, knockout_match_id))

            # Points: 3 = exact score, 1 = correct tendency/winner
            cur.execute("""
                UPDATE knockout_predictions
                SET points =
                    CASE
                        WHEN pred_home = %s AND pred_away = %s THEN 3
                        WHEN pred_winner IS NOT NULL AND pred_winner = %s THEN 1
                        WHEN %s IS NULL AND (
                            (pred_home > pred_away AND %s > %s)
                            OR (pred_home < pred_away AND %s < %s)
                            OR (pred_home = pred_away AND %s = %s)
                        ) THEN 1
                        ELSE 0
                    END
                WHERE knockout_match_id = %s
            """, (
                home_score, away_score,
                winner,
                winner, home_score, away_score, home_score, away_score, home_score, away_score,
                knockout_match_id
            ))

        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Results saved and points updated.'), 200


if __name__ == '__main__':
    init_db()
    app.run(debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')