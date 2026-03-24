"""
Database initialization script
Run this script to initialize the database with all tables
"""

import sys
import os

# Add parent directory to path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from config import ENVIRONMENT

def main():
    print("=" * 50)
    print("AI PDF Bot - Database Initialization")
    print("=" * 50)
    print(f"Environment: {ENVIRONMENT.upper()}")
    
    try:
        init_db()
        print("\n" + "=" * 50)
        print("✓ Database initialization completed successfully!")
        print("=" * 50)
    except Exception as e:
        print(f"\n✗ Error initializing database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()