import time
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers.users import router
from routers.document_process import router as document_router
from routers.chat import router as chat_router
from database import init_db
from config import ALLOWED_ORIGINS


def _init_db_with_retry(max_attempts: int = 5, delay: int = 5) -> None:
    """Attempt to initialise the database, retrying on transient failures."""
    for attempt in range(1, max_attempts + 1):
        try:
            init_db()
            print("✓ Database initialised successfully")
            return
        except Exception as exc:
            if attempt < max_attempts:
                print(
                    f"Database init attempt {attempt}/{max_attempts} failed: {exc}. "
                    f"Retrying in {delay}s..."
                )
                time.sleep(delay)
            else:
                # Log the failure but do NOT raise — the server must still bind
                # to the PORT so Cloud Run health-checks succeed.
                print(
                    f"Database init failed after {max_attempts} attempts: {exc}. "
                    "Continuing startup; endpoints that need the DB will return errors."
                )


# Initialize database before app startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run blocking DB init in a thread so the event loop stays responsive
    await asyncio.get_event_loop().run_in_executor(None, _init_db_with_retry)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api", tags=["users"])
app.include_router(document_router, prefix="/api", tags=["documents"])
app.include_router(chat_router, prefix="/api", tags=["chat"])

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
