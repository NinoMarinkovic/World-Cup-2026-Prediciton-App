# World Cup 2026 Prediction App

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-green.svg)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/NinoMarinkovic/World-Cup-2026-Prediction-App/ci.yml?branch=main)](https://github.com/features/actions)

## About

The World Cup 2026 Prediction App is a Flask web application for predicting football matches. Users can register, log in, submit predictions, and view a live leaderboard. The app supports admin management for match creation and result submission.

Kickoff times are handled in UTC to keep scheduling consistent across deployments.

## Features

- User registration, login and logout
- Match prediction submission
- Live leaderboard with leaderboard ranking
- Admin panel for adding matches and submitting results
- Rate limiting for API endpoints via Flask-Limiter
- MySQL-backed storage for users, matches and predictions
- Docker support
- GitHub Actions CI
- Render deployment configuration

## Tech Stack

- Python 3.13
- Flask 3.1.3
- Flask-Limiter
- PyMySQL
- bcrypt
- HTML/CSS/JavaScript
- MySQL / Aiven MySQL
- Docker
- GitHub Actions
- Render

## Project Structure

```
wm-prediction-app/
├── .dockerignore
├── .env
├── .gitignore
├── .github/
│   └── workflows/ci.yml
├── add_admin.py
├── add_indexes.py
├── ca.pem
├── Dockerfile
├── init_db.py
├── LICENSE
├── main.py
├── README.md
├── render.yaml
├── requirements.txt
├── seed_matches.py
├── static/
│   ├── css/
│   │   ├── base.css
│   │   ├── index.css
│   │   ├── leaderboard.css
│   │   └── matches.css
│   └── js/
│       ├── index.js
│       ├── leaderboard.js
│       └── matches.js
├── templates/
│   ├── admin.html
│   ├── index.html
│   ├── leaderboard.html
│   └── matches.html
└── test_main.py
```

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

2. Create and activate a virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root

5. Start the application

```bash
python main.py
```

6. Open the app in your browser

`http://127.0.0.1:5000`

## Environment Variables

Create or update the `.env` file with the following variables:

```env
FLASK_APP=main.py
FLASK_ENV=development
SECRET_KEY=your_secret_key
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

## API Rate Limits

The application protects API endpoints with IP-based rate limiting:

- `/api/login` → 10 requests per minute
- `/api/register` → 5 requests per minute
- Other `/api/*` routes → 60 requests per minute

## Deployment

### Docker

1. Build the Docker image

```bash
docker build -t wm-prediction-app .
```

2. Run the container

```bash
docker run -d -p 5000:5000 --env-file .env wm-prediction-app
```

### Render

The project includes `render.yaml` for deployment configuration.

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn main:app --bind 0.0.0.0:8000`
- Configure Render env vars: `SECRET_KEY`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Continuous Integration

The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.

It runs on pushes and pull requests to `main`, using Python 3.13 and executing:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pytest test_main.py
```

## License

This project is licensed under the [MIT License](LICENSE).
