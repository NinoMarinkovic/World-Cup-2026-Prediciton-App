import pytest
from datetime import datetime, timedelta, timezone
import main


class FakeCursor:
    def __init__(self, results):
        self.results = results
        self._current = None

    def execute(self, query, params=None):
        normalized = ' '.join(query.split()).upper()
        for key, val in self.results.items():
            if key.upper() in normalized:
                self._current = val
                return
        self._current = None

    def fetchone(self):
        return self._current

    def fetchall(self):
        if self._current is None:
            return []
        if isinstance(self._current, list):
            return self._current
        return [self._current]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class FakeConn:
    def __init__(self, results):
        self._cursor = FakeCursor(results)

    def cursor(self):
        return self._cursor

    def commit(self):
        pass

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def make_user(password_plain, is_admin=0):
    return {
        'id': 1,
        'username': 'Alice',
        'password_hash': main.hash_password(password_plain),
        'is_admin': is_admin,
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def app_instance():
    main.app.config['TESTING'] = True
    main.app.config['SECRET_KEY'] = 'test-secret'
    return main.app


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


@pytest.fixture
def auth_session(client):
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['user_name'] = 'Alice'
        sess['is_admin'] = False


@pytest.fixture
def admin_session(client):
    with client.session_transaction() as sess:
        sess['user_id'] = 2
        sess['user_name'] = 'Admin'
        sess['is_admin'] = True


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class TestRegister:
    def test_missing_fields_returns_400(self, client):
        rv = client.post('/api/register', json={})
        assert rv.status_code == 400

    def test_weak_password_returns_400(self, client):
        rv = client.post('/api/register', json={
            'name': 'Alice',
            'email': 'alice@example.com',
            'password': 'weak',
        })
        assert rv.status_code == 400

    def test_invalid_email_returns_400(self, client):
        rv = client.post('/api/register', json={
            'name': 'Alice',
            'email': 'not-an-email',
            'password': 'Secure1$',
        })
        assert rv.status_code == 400

    def test_successful_registration_returns_201(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT ID FROM USERS WHERE EMAIL': None,
            'INSERT INTO USERS': None,
        }))
        rv = client.post('/api/register', json={
            'name': 'Alice',
            'email': 'alice@example.com',
            'password': 'Secure1$',
        })
        assert rv.status_code == 201

    def test_duplicate_email_returns_400(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT ID FROM USERS WHERE EMAIL': make_user('Secure1$'),
        }))
        rv = client.post('/api/register', json={
            'name': 'Alice',
            'email': 'alice@example.com',
            'password': 'Secure1$',
        })
        assert rv.status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_missing_fields_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM USERS WHERE EMAIL': None,
        }))
        rv = client.post('/api/login', json={})
        assert rv.status_code == 404

    def test_user_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM USERS WHERE EMAIL': None,
        }))
        rv = client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'Correct1$',
        })
        assert rv.status_code == 404

    def test_incorrect_password_returns_401(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM USERS WHERE EMAIL': make_user('Correct1$'),
        }))
        rv = client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'WrongPass1$',
        })
        assert rv.status_code == 401

    def test_success_sets_session(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM USERS WHERE EMAIL': make_user('Correct1$'),
        }))
        rv = client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'Correct1$',
        })
        assert rv.status_code == 200
        with client.session_transaction() as sess:
            assert sess.get('user_id') == 1
            assert sess.get('user_name') == 'Alice'
            assert 'is_admin' in sess

    def test_admin_flag_set_in_session(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM USERS WHERE EMAIL': make_user('Correct1$', is_admin=1),
        }))
        rv = client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'Correct1$',
        })
        assert rv.status_code == 200
        with client.session_transaction() as sess:
            assert sess.get('is_admin') is True


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------

class TestPredictions:
    def test_submit_prediction_unauthenticated_returns_401(self, client):
        rv = client.post('/api/predictions', json={
            'match_id': 1, 'pred_home': 2, 'pred_away': 1,
        })
        assert rv.status_code == 401

    def test_submit_prediction_authenticated(self, client, monkeypatch, auth_session):
        future_match = {
            'id': 1,
            'kickoff_time': datetime.now() + timedelta(hours=2),
            'finished': False,
        }
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM MATCHES WHERE ID': future_match,
            'INSERT INTO PREDICTIONS': None,
        }))
        rv = client.post('/api/predictions', json={
            'match_id': 1, 'pred_home': 2, 'pred_away': 1,
        })
        assert rv.status_code == 200

    def test_submit_prediction_past_match_returns_400(self, client, monkeypatch, auth_session):
        past_match = {
            'id': 1,
            'kickoff_time': datetime.now() - timedelta(hours=2),
            'finished': False,
        }
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM MATCHES WHERE ID': past_match,
        }))
        rv = client.post('/api/predictions', json={
            'match_id': 1, 'pred_home': 2, 'pred_away': 1,
        })
        assert rv.status_code == 400


# ---------------------------------------------------------------------------
# Results (admin only)
# ---------------------------------------------------------------------------

class TestResults:
    def test_submit_result_unauthenticated_returns_401(self, client):
        rv = client.post('/api/results', json={
            'match_id': 1, 'home_score': 2, 'away_score': 1,
        })
        assert rv.status_code == 401

    def test_submit_result_non_admin_returns_403(self, client, auth_session):
        rv = client.post('/api/results', json={
            'match_id': 1, 'home_score': 2, 'away_score': 1,
        })
        assert rv.status_code == 403

    def test_submit_result_as_admin(self, client, monkeypatch, admin_session):
        match = {'id': 1, 'finished': False, 'home_score': None, 'away_score': None}
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT * FROM MATCHES WHERE ID': match,
            'UPDATE MATCHES': None,
            'UPDATE PREDICTIONS': None,
        }))
        rv = client.post('/api/results', json={
            'match_id': 1, 'home_score': 2, 'away_score': 1,
        })
        assert rv.status_code == 200


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

class TestLeaderboard:
    def test_leaderboard_unauthenticated_redirects(self, client):
        rv = client.get('/leaderboard')
        assert rv.status_code in (302, 401)

    def test_leaderboard_api_returns_data(self, client, monkeypatch):
        monkeypatch.setattr(main, 'get_db', lambda: FakeConn({
            'SELECT U.USERNAME': [
                {'username': 'Alice', 'total_points': 10},
                {'username': 'Bob', 'total_points': 7},
            ]
        }))
        rv = client.get('/api/leaderboard')
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'leaderboard' in data