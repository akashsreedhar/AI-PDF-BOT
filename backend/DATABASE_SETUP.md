# AI PDF Bot Backend - Database Setup Guide

## Overview
The backend now includes a complete database setup with support for:
- **Local Development**: SQLite (file-based)
- **Production**: Google Cloud SQL (MySQL)

## File Structure
```
backend/
├── app.py              # Main FastAPI application with database initialization
├── config.py           # Configuration management for local/GCP
├── database.py         # Database engine, session, and initialization
├── models.py           # SQLAlchemy ORM models (User)
├── schemas.py          # Pydantic request/response schemas
├── init_db.py          # Standalone script to initialize database
├── routers/
│   ├── __init__.py
│   └── users.py        # User CRUD endpoints
├── .env.example        # Environment configuration template
└── requirements.txt    # Python dependencies
```

## Configuration

### Local Development (SQLite)
By default, the backend uses SQLite stored in `./data/ai_pdf_bot.db`

1. Create `.env` file from template:
```bash
cp .env.example .env
```

2. Ensure `ENVIRONMENT=local` in `.env`:
```
ENVIRONMENT=local
DB_PATH=./data/ai_pdf_bot.db
SQLALCHEMY_ECHO=False
```

### GCP Cloud SQL (Production)
To deploy on Google Cloud SQL:

1. Update `.env` with your Cloud SQL details:
```
ENVIRONMENT=gcp
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=your-project:your-region:instance-name
DB_PORT=3306
DB_NAME=ai_pdf_bot
```

2. Install additional dependencies:
```bash
pip install pymysql
```

## Database Initialization

### Automatic Initialization
Tables are created automatically when the FastAPI server starts:
```bash
cd backend
uvicorn app:app --reload
```

### Manual Initialization
Run the standalone initialization script:
```bash
cd backend
python init_db.py
```

## API Endpoints

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/{user_id}` - Get a specific user
- `POST /api/users` - Create a new user
- `PUT /api/users/{user_id}` - Update a user
- `DELETE /api/users/{user_id}` - Delete a user

### Health Check
- `GET /health` - Application health status
- `GET /` - Root endpoint with welcome message

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Running the Application

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Production (GCP)
```bash
# Set environment variable
export ENVIRONMENT=gcp

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

## Deployment Notes

### For GCP Cloud Run
1. Create a `.env` file with Cloud SQL credentials
2. Use Cloud SQL Auth proxy or Unix socket for connections
3. Ensure firewall rules allow connections

### Connection String for Cloud SQL
- Unix socket: `mysql+pymysql://user:password@/database?unix_socket=/cloudsql/project:region:instance`
- TCP: `mysql+pymysql://user:password@host:port/database`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| ENVIRONMENT | local | Either `local` or `gcp` |
| DB_PATH | ./data/ai_pdf_bot.db | SQLite database file path (local only) |
| DB_USER | root | Database user (GCP only) |
| DB_PASSWORD | | Database password (GCP only) |
| DB_HOST | 127.0.0.1 | Database host (GCP only) |
| DB_PORT | 3306 | Database port (GCP only) |
| DB_NAME | ai_pdf_bot | Database name (GCP only) |
| SQLALCHEMY_ECHO | False | Enable SQLAlchemy query logging |
| SQLALCHEMY_POOL_RECYCLE | 3600 | Connection pool recycle time (seconds) |

## Adding New Models

1. Create model in `models.py`:
```python
from sqlalchemy import Column, String
from database import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
```

2. Create schema in `schemas.py`:
```python
class DocumentResponse(BaseModel):
    id: int
    title: str
```

3. Create router in `routers/documents.py` and include in `app.py`

4. Run `python init_db.py` to create new tables

## Troubleshooting

### SQLite Database Not Found
- Ensure `./data/` directory exists or create manually
- Check `DB_PATH` in `.env` file

### GCP Connection Errors
- Verify Cloud SQL instance is running
- Check credentials in `.env`
- Ensure application has Cloud SQL Client role
- Verify firewall rules if using TCP connection

### Table Already Exists
- SQLAlchemy `create_all()` is safe to run multiple times
- Tables are only created if they don't exist