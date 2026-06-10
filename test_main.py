import pytest
from datetime import datetime, timedelta

import main


class FakeCursor:
    def __init__(self, results):
        self.results = results
        self._current = None

    def execute(self, query, params=None):
        normalized = ' '.join(query.split())
        for key, value in self.results.items():
            if key in normalized:
                self._current = value
                return
        self._current = None

    def fetchone(self):
        if self._current is None:
            return None
        if isinstance(self._current, list):
            return self._current[0] if self._current else None
        return self._current

    def fetchall(self):
        if self._current is None:
            return []
        if isinstance(self._current, list):
            return self._current
        return [self._current]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, results):
        self.cursor_obj = FakeCursor(results)
        self.committed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def close(self):
        pass


@pytest.fixture(autouse=True)
def app():
    main.app.config['TESTING'] = True
    main.app.secret_key = 'test_secret'
    return main.app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def fake_db(monkeypatch):
    def _fake_db(results):
        conn = FakeConnection(results)
        monkeypatch.setattr(main, 'get_db', lambda: conn)
        return conn
    return _fake_db


def test_validate_email_accepts_valid_email():
    assert main.validate_email('user@example.com')


def test_validate_email_rejects_invalid_email():
    assert not main.validate_email('invalid-email')
    assert not main.validate_email('user@localhost')
    assert not main.validate_email('user@.com')


def test_validate_password_accepts_strong_password():
    assert main.validate_password('Abc123$')


def test_validate_password_rejects_weak_password():
    assert not main.validate_password('password')
    assert not main.validate_password('Abc123')
    assert not main.validate_password('abc$123')


def test_hash_and_verify_password():
    password = 'Strong1$'
    hashed = main.hash_password(password)
    assert isinstance(hashed, str)
    assert main.verify_password(hashed, password)
    assert not main.verify_password(hashed, 'Wrong1$')


def test_api_register_valid_data_creates_account(client, fake_db):
    conn = fake_db({
        'SELECT id FROM users WHERE email = %s': None,
    })

    response = client.post('/api/register', json={
        'name': 'Alice',
        'email': 'alice@example.com',
        'password': 'Abc123$'
    })

    assert response.status_code == 201
    assert response.get_json() == {'message': 'Account created successfully.'}
    assert conn.committed is True


def test_api_register_rejects_short_name(client):
    response = client.post('/api/register', json={
        'name': 'Al',
        'email': 'alice@example.com',
        'password': 'Abc123$'
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Username must be between 3 and 30 characters.'


def test_api_register_rejects_invalid_email(client):
    response = client.post('/api/register', json={
        'name': 'Alice',
        'email': 'not-an-email',
        'password': 'Abc123$'
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Invalid email address.'


def test_api_register_rejects_weak_password(client):
    response = client.post('/api/register', json={
        'name': 'Alice',
        'email': 'alice@example.com',
        'password': 'weak'
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Password does not meet the requirements.'


def test_api_register_rejects_duplicate_email(client, fake_db):
    conn = fake_db({
        'SELECT id FROM users WHERE email = %s': {'id': 1}
    })

    response = client.post('/api/register', json={
        'name': 'Alice',
        'email': 'alice@example.com',
        'password': 'Abc123$'
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'An account with this email already exists.'
    assert conn.committed is False


def test_api_login_returns_not_found_for_unknown_email(client, fake_db):
    fake_db({
        'SELECT * FROM users WHERE email = %s': None,
    })

    response = client.post('/api/login', json={
        'email': 'unknown@example.com',
        'password': 'Abc123$'
    })

    assert response.status_code == 404
    assert response.get_json()['error'] == 'No account found for this email.'


def test_api_login_incorrect_password_increments_attempts(client, fake_db):
    fake_db({
        'SELECT * FROM users WHERE email = %s': {
            'id': 1,
            'username': 'Alice',
            'password_hash': main.hash_password('Correct1$')
        }
    })

    response = client.post('/api/login', json={
        'email': 'alice@example.com',
        'password': 'Wrong1$'
    })

    assert response.status_code == 401
    assert response.get_json()['error'] == 'Incorrect password.'
    assert response.get_json()['remaining'] == 2


def test_api_login_locks_after_three_failed_attempts(client, fake_db):
    fake_db({
        'SELECT * FROM users WHERE email = %s': {
            'id': 1,
            'username': 'Alice',
            'password_hash': main.hash_password('Correct1$')
        }
    })

    for _ in range(3):
        response = client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'Wrong1$'
        })

    assert response.status_code == 403
    assert response.get_json()['locked'] is True


def test_api_login_success_sets_session(client, fake_db):
    fake_db({
        'SELECT * FROM users WHERE email = %s': {
            'id': 1,
            'username': 'Alice',
            'password_hash': main.hash_password('Correct1$')
        }
    })

    response = client.post('/api/login', json={
        'email': 'alice@example.com',
        'password': 'Correct1$'
    })

    assert response.status_code == 200
    assert response.get_json() == {'message': 'Login successful.', 'username': 'Alice'}

    with client.session_transaction() as sess:
        assert sess['user_id'] == 1
        assert sess['user_name'] == 'Alice'


def test_api_logout_clears_session(client):
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['user_name'] = 'Alice'

    response = client.post('/api/logout')

    assert response.status_code == 200
    assert response.get_json() == {'message': 'Logged out.'}

    with client.session_transaction() as sess:
        assert 'user_id' not in sess
        assert 'user_name' not in sess


def test_api_submit_prediction_requires_authentication(client):
    response = client.post('/api/predictions', json={
        'match_id': 1,
        'pred_home': 2,
        'pred_away': 1
    })

    assert response.status_code == 401
    assert response.get_json()['error'] == 'Unauthorized'


def test_api_submit_prediction_rejects_invalid_input(client):
    with client.session_transaction() as sess:
        sess['user_id'] = 1

    response = client.post('/api/predictions', json={
        'match_id': 'one',
        'pred_home': 2,
        'pred_away': 1
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Invalid input. Match ID and predictions must be integers.'


def test_api_submit_prediction_rejects_finished_match(client, fake_db):
    with client.session_transaction() as sess:
        sess['user_id'] = 1

    fake_db({
        'SELECT * FROM matches WHERE id = %s': {
            'id': 1,
            'finished': True,
            'kickoff_time': datetime.now() + timedelta(hours=1)
        }
    })

    response = client.post('/api/predictions', json={
        'match_id': 1,
        'pred_home': 2,
        'pred_away': 1
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Cannot predict on finished matches.'


def test_api_submit_prediction_rejects_closed_match(client, fake_db):
    with client.session_transaction() as sess:
        sess['user_id'] = 1

    fake_db({
        'SELECT * FROM matches WHERE id = %s': {
            'id': 1,
            'finished': False,
            'kickoff_time': datetime.now() - timedelta(minutes=1)
        }
    })

    response = client.post('/api/predictions', json={
        'match_id': 1,
        'pred_home': 2,
        'pred_away': 1
    })

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Predictions are closed for this match.'


def test_api_submit_prediction_success(client, fake_db):
    with client.session_transaction() as sess:
        sess['user_id'] = 1

    conn = fake_db({
        'SELECT * FROM matches WHERE id = %s': {
            'id': 1,
            'finished': False,
            'kickoff_time': datetime.now() + timedelta(hours=2)
        }
    })

    response = client.post('/api/predictions', json={
        'match_id': 1,
        'pred_home': 2,
        'pred_away': 1
    })

    assert response.status_code == 200
    assert response.get_json() == {'message': 'Prediction submitted successfully.'}
    assert conn.committed is True


def test_api_get_matches_returns_array(client, fake_db):
    fake_db({
        'SELECT * FROM matches ORDER BY kickoff_time ASC': [
            {'id': 1, 'home_team': 'A', 'away_team': 'B', 'kickoff_time': datetime.now()}
        ]
    })

    response = client.get('/api/matches')
    assert response.status_code == 200
    assert 'matches' in response.get_json()


def test_api_leaderboard_returns_array(client, fake_db):
    fake_db({
        'SELECT u.username, COALESCE(SUM(p.points), 0) AS total_points': [
            {'username': 'Alice', 'total_points': 5}
        ]
    })

    response = client.get('/api/leaderboard')
    assert response.status_code == 200
    assert response.get_json() == {'leaderboard': [{'username': 'Alice', 'total_points': 5}]}
