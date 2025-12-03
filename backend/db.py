import os
import re
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, encoding='utf-8')

DATABASE_URL = os.getenv("DATABASE_URL")

# Encode the DATABASE_URL properly to handle special characters in password
if DATABASE_URL:
    try:
        # Pattern to match: postgresql+psycopg2://user:password@host:port/database
        pattern = r'(postgresql\+psycopg2://)([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)'
        match = re.match(pattern, DATABASE_URL)
        
        if match:
            scheme = match.group(1)
            username = match.group(2)
            password = match.group(3)
            hostname = match.group(4)
            port = match.group(5)
            database = match.group(6)
            
            # URL-encode the password to handle special characters
            password_encoded = quote_plus(password)
            
            # Reconstruct the URL with encoded password
            if port:
                DATABASE_URL = f"{scheme}{username}:{password_encoded}@{hostname}:{port}/{database}"
            else:
                DATABASE_URL = f"{scheme}{username}:{password_encoded}@{hostname}/{database}"
    except Exception as e:
        print(f"[WARN] Failed to encode DATABASE_URL, using as-is: {e}")

engine = create_engine(DATABASE_URL) if DATABASE_URL else None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

Base = declarative_base()


def get_db():
    """Yield a database session if the database is configured."""
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


