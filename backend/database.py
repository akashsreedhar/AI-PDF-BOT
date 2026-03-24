import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from config import DATABASE_URL, ENVIRONMENT, SQLALCHEMY_ECHO, SQLALCHEMY_POOL_RECYCLE

# Create engine based on environment
if ENVIRONMENT == "local":
    # SQLite specific configuration for local development
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=SQLALCHEMY_ECHO,
    )
else:
    # MySQL/Cloud SQL configuration for production
    engine = create_engine(
        DATABASE_URL,
        pool_recycle=SQLALCHEMY_POOL_RECYCLE,
        echo=SQLALCHEMY_ECHO,
        pool_pre_ping=True,  # Verify connections before using them
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency for getting database session in routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database by creating all tables"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables initialized successfully")