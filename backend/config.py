import os
from enum import Enum
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Environment(str, Enum):
    LOCAL = "local"
    GCP = "gcp"

# Get environment from env variable, default to local
ENVIRONMENT = os.getenv("ENVIRONMENT", Environment.LOCAL.value)

# Database configuration
if ENVIRONMENT == Environment.GCP.value:
    # GCP Cloud SQL configuration
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "ai_pdf_bot")
    
    # For Cloud SQL, use MySQL
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Local SQLite configuration
    # Database file will be stored in backend directory
    DB_PATH = os.getenv("DB_PATH", "./data/ai_pdf_bot.db")
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLAlchemy engine configuration
SQLALCHEMY_ECHO = os.getenv("SQLALCHEMY_ECHO", "False").lower() == "true"
SQLALCHEMY_POOL_RECYCLE = int(os.getenv("SQLALCHEMY_POOL_RECYCLE", "3600"))

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "akash-vamsi-project-1")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

print(f"✓ Environment: {ENVIRONMENT}")
print(f"✓ Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")