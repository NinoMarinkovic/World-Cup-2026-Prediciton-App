# World Cup 2026 Prediction App

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3-green.svg)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/USERNAME/REPO_NAME/main.yml?branch=main)](https://github.com/features/actions)

## About
The World Cup 2026 Prediction App is a web application for predicting FIFA World Cup 2026 matches. Users can register, log in, and submit match predictions. The app collects results, calculates rankings, and displays a competitive leaderboard.

Please note: To ensure consistent scheduling across different server deployments, all match kickoff times are stored and processed strictly in UTC time. The application automatically handles the timezone conversion to deliver a seamless experience for users worldwide.

## Features

- User authentication (registration, login, logout)
- Match predictions for World Cup games
- Personal prediction history
- Live leaderboard with ranking
- Database-backed storage for users, matches, and predictions
- Docker support for local development and production
- CI/CD with GitHub Actions
- Deployment on Render with Aiven MySQL

## Tech Stack

- Python
- Flask
- MySQL / Aiven MySQL
- HTML
- CSS
- JavaScript
- Docker
- GitHub Actions
- Render

## Project Structure

```
World Cup 2026 Prediction App/
├── Dockerfile
├── README.md
├── main.py
├── requirements.txt
├── render.yaml
├── .env
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

2. Create a virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Configure environment variables

Create a `.env` file in the project root and add the required variables (see below).

5. Start the application

```bash
python main.py
```

6. Open the app in your browser

`http://127.0.0.1:5000`

## Environment Variables

Create or update the `.env` file with the following entries:

```env
FLASK_APP=main.py
FLASK_ENV=development
SECRET_KEY=your_secret_key
MYSQL_HOST=your_database_host
MYSQL_PORT=3306
MYSQL_USER=your_database_user
MYSQL_PASSWORD=your_database_password
MYSQL_DATABASE=your_database_name
```

> Note: For deployment on Render, Aiven MySQL is typically used. Make sure the Render environment variables match your Aiven MySQL credentials.

## Deployment

### Docker

1. Build the Docker image

```bash
docker build -t world-cup-2026-prediction-app .
```

2. Run the container

```bash
docker run -d -p 5000:5000 --env-file .env world-cup-2026-prediction-app
```

### Render

- Use `render.yaml` to configure deployment.
- Set up Aiven MySQL as the managed database.
- Configure Render environment variables for `SECRET_KEY`, `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`.
- Render will automatically deploy from the GitHub repository.

### GitHub Actions

- The repository should include a workflow file that runs tests and deploys the application on updates to the `main` branch.
- Check the GitHub Actions configuration in `.github/workflows/`.

## License

This project is licensed under the [MIT License](LICENSE).
