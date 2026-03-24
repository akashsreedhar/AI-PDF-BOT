from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers.users import router
from database import init_db

# Initialize database before app startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    print("✓ Application started successfully")
    yield
    # Shutdown: Cleanup if needed
    print("✓ Application shutdown")

app = FastAPI(
    title="AI PDF Bot Backend",
    version="1.0.0",
    description="AI PDF Bot - Backend API with SQLite/Cloud SQL support",
    lifespan=lifespan
)

app.include_router(router, prefix="/api", tags=["users"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI PDF Bot Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
