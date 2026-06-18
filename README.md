# World Cup 2026 Prediction App

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-green.svg)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## About

**WM Predictor 2026** is a sophisticated web application designed for FIFA World Cup 2026 match predictions. Users can compete with friends and colleagues by predicting match results, earning points based on accuracy, and tracking performance on a live leaderboard. The platform features comprehensive admin tools for tournament management and real-time result updates.

## Key Features

- **User Management**: Secure registration and authentication with bcrypt password hashing
- **Match Predictions**: Submit predictions for group stage and knockout tournaments
- **Live Leaderboard**: Real-time rankings with point calculations
- **Knockout System**: Full bracket support with K.O. round predictions
- **Admin Dashboard**: Manage matches, results, and user administration
- **Rate Limiting**: Protected API endpoints with Flask-Limiter
- **Responsive Design**: Mobile-friendly interface built with modern CSS
- **Production-Ready**: Docker containerization and cloud deployment support

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python 3.13, Flask 3.1.3 |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Database** | MySQL 8.0 / Aiven |
| **Authentication** | bcrypt, Flask Sessions |
| **Deployment** | Docker, Render, GitHub Actions |
| **Tools** | PyMySQL, Flask-Limiter |

## Project Structure

```
wm-prediction-app/
├── main.py                  # Flask application & routes
├── init_db.py              # Database initialization
├── add_admin.py            # Admin user creation
├── add_indexes.py          # Database index optimization
├── knockout_patch.py       # K.O. tournament setup
├── test_main.py            # Test suite
├── Dockerfile              # Container configuration
├── render.yaml             # Render deployment config
├── requirements.txt        # Python dependencies
├── static/
│   ├── css/               # Stylesheets
│   │   ├── base.css
│   │   ├── index.css
│   │   ├── matches.css
│   │   ├── leaderboard.css
│   │   ├── profile.css
│   │   └── bracket.css
│   └── js/                # JavaScript modules
│       ├── index.js
│       ├── matches.js
│       ├── leaderboard.js
│       ├── profile.js
│       └── bracket.js
└── templates/
    ├── index.html         # Login/Register
    ├── matches.html       # Match predictions
    ├── leaderboard.html   # Standings
    ├── profile.html       # User profile
    ├── admin.html         # Admin panel
    └── bracket.html       # K.O. bracket
```

## Installation

### Prerequisites

- Python 3.13+
- MySQL 8.0+
- Docker (optional)
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NinoMarinkovic/World-Cup-2026-Prediciton-App.git
   cd World-Cup-2026-Prediciton-App
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate    # On Windows: .venv\Scripts\Activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Initialize database**
   ```bash
   python init_db.py
   python add_indexes.py
   ```

6. **Create admin user**
   ```bash
   python add_admin.py
   ```

7. **Run application**
   ```bash
   python main.py
   ```

   Access at `http://localhost:5000`

## Docker Deployment

### Build & Run Locally

```bash
docker build -t wm-predictor:latest .
docker run -p 5000:5000 --env-file .env wm-predictor:latest
```

### Deploy to Render

1. Push to GitHub
2. Connect repository to Render
3. Use `render.yaml` configuration
4. Set environment variables in Render dashboard
5. Deploy

## Configuration

### Environment Variables

```env
# Database
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=wm_prediction
DB_SSL_CA=/path/to/ca.pem

# Flask
SECRET_KEY=your-secret-key
FLASK_ENV=production
```

### Database Schema

The application automatically creates tables for:
- `users` - User accounts & authentication
- `matches` - Group stage matches
- `predictions` - User predictions for matches
- `knockout_matches` - K.O. tournament brackets
- `knockout_predictions` - K.O. round predictions

## API Endpoints

### Authentication
- `POST /api/register` - Create account
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user

### Matches
- `GET /api/matches` - Fetch all matches
- `GET /api/matches/<id>` - Get match details
- `POST /api/predict` - Submit prediction

### Knockout
- `GET /api/knockout/matches` - Get K.O. fixtures
- `POST /api/knockout/predictions` - Submit K.O. prediction

### Admin
- `POST /api/matches` - Create/update match
- `POST /api/results` - Submit final scores
- `GET /admin/users` - Manage users

## Testing

```bash
pytest -v           # Run all tests
pytest -q           # Quiet mode
pytest --cov        # With coverage
```

## Development

### Code Style
- PEP 8 compliant Python
- Semantic HTML structure
- BEM methodology for CSS

### Git Workflow
```bash
git checkout -b feature/description
git commit -m "feat: descriptive message"
git push origin feature/description
# Create Pull Request
```

## Deployment Checklist

- [ ] Database configured & migrations applied
- [ ] Admin user created
- [ ] Environment variables set
- [ ] SSL certificate installed (if required)
- [ ] Rate limiting configured
- [ ] Backup strategy in place
- [ ] Monitoring/logging configured
- [ ] Tests passing (18/18)

## Performance Considerations

- Database indexes on frequently queried columns
- Session caching for authenticated users
- Rate limiting (60 requests/minute default)
- Gzip compression for static assets
- UTC timezone for consistent scheduling

## Security

- Passwords hashed with bcrypt (bcrypt 4.0.1)
- SQL injection protection via parameterized queries
- CSRF protection via Flask sessions
- Rate limiting on sensitive endpoints
- XSS prevention through template escaping
- Environment variables for sensitive configuration

## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

For issues, questions, or contributions, please visit the [GitHub Repository](https://github.com/NinoMarinkovic/World-Cup-2026-Prediciton-App).

---

**Last Updated**: June 2026 | **Status**: Production Ready ✅
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
