from datetime import datetime

from flask import Blueprint, jsonify, render_template, request, session

import pymysql
from main import (
    admin_required,
    get_current_user_id,
    get_db,
    login_required,
)

knockout_bp = Blueprint('knockout', __name__)

VALID_ROUNDS = ('R32', 'R16', 'QF', 'SF', 'TP', 'F')
ROUND_ORDER = "'R32','R16','QF','SF','TP','F'"


@knockout_bp.route('/bracket')
@login_required
def bracket():
    return render_template('bracket.html', username=session['user_name'])


@knockout_bp.route('/api/knockout/matches', methods=['GET'])
@login_required
def api_get_knockout_matches():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT * FROM knockout_matches ORDER BY FIELD(round,{ROUND_ORDER}), slot ASC"
            )
            matches = cur.fetchall()
    finally:
        conn.close()
    return jsonify(matches=matches), 200


@knockout_bp.route('/api/knockout/matches', methods=['POST'])
@admin_required
def api_add_knockout_match():
    data = request.json
    round_ = (data.get('round') or '').strip().upper()
    slot = data.get('slot')
    home_team = (data.get('home_team') or '').strip()
    away_team = (data.get('away_team') or '').strip()
    kickoff = (data.get('kickoff_time') or '').strip()

    if round_ not in VALID_ROUNDS:
        return jsonify(error=f"round must be one of {', '.join(VALID_ROUNDS)}."), 400
    if not isinstance(slot, int):
        return jsonify(error='slot must be an integer.'), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO knockout_matches (round, slot, home_team, away_team, kickoff_time)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    home_team = VALUES(home_team),
                    away_team = VALUES(away_team),
                    kickoff_time = VALUES(kickoff_time)
                """,
                (round_, slot, home_team or None, away_team or None, kickoff or None),
            )
        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Knockout match saved.'), 201


@knockout_bp.route('/api/knockout/predictions', methods=['POST'])
@login_required
def api_submit_knockout_prediction():
    data = request.json
    knockout_match_id = data.get('knockout_match_id')
    pred_home = data.get('pred_home')
    pred_away = data.get('pred_away')
    pred_winner = (data.get('pred_winner') or '').strip() or None

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
                cur.execute(
                    """
                    INSERT INTO knockout_predictions (user_id, knockout_match_id, pred_home, pred_away, pred_winner)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        pred_home = VALUES(pred_home),
                        pred_away = VALUES(pred_away),
                        pred_winner = VALUES(pred_winner)
                    """,
                    (user_id, knockout_match_id, pred_home, pred_away, pred_winner),
                )
            except pymysql.err.IntegrityError:
                return jsonify(error='Prediction error.'), 400

        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Prediction saved.'), 200


@knockout_bp.route('/api/knockout/predictions', methods=['GET'])
@login_required
def api_get_my_knockout_predictions():
    user_id = get_current_user_id()
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT kp.*, km.round, km.slot, km.home_team, km.away_team
                FROM knockout_predictions kp
                JOIN knockout_matches km ON kp.knockout_match_id = km.id
                WHERE kp.user_id = %s
                """,
                (user_id,),
            )
            preds = cur.fetchall()
    finally:
        conn.close()
    return jsonify(predictions=preds), 200


@knockout_bp.route('/api/knockout/results', methods=['POST'])
@admin_required
def api_submit_knockout_results():
    data = request.json
    knockout_match_id = data.get('knockout_match_id')
    home_score = data.get('home_score')
    away_score = data.get('away_score')
    home_penalties = data.get('home_penalties')
    away_penalties = data.get('away_penalties')
    winner = (data.get('winner') or '').strip() or None

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

            cur.execute(
                """
                UPDATE knockout_matches
                SET home_score=%s, away_score=%s,
                    home_penalties=%s, away_penalties=%s,
                    finished=TRUE
                WHERE id=%s
                """,
                (home_score, away_score, home_penalties, away_penalties, knockout_match_id),
            )

            cur.execute(
                """
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
                """,
                (
                    home_score,
                    away_score,
                    winner,
                    winner,
                    home_score,
                    away_score,
                    home_score,
                    away_score,
                    home_score,
                    away_score,
                    knockout_match_id,
                ),
            )

        conn.commit()
    finally:
        conn.close()
    return jsonify(message='Results saved and points updated.'), 200