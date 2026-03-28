import asyncio
from sqlalchemy import create_engine, text
from app.config import settings

async def check_columns():
    # Use sync engine for simplicity or async if needed
    # Settings DATABASE_URL is postgresql+asyncpg://...
    url = settings.DATABASE_URL.replace("asyncpg", "psycopg2")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'"))
            columns = [row[0] for row in result]
            print(f"Columns in students: {columns}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import os
    import sys
    # Add project root to sys.path
    project_root = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(project_root)
    
    from app.config import settings
    
    # Run the check
    url = settings.DATABASE_URL.replace("+asyncpg", "")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'"))
            columns = [row[0] for row in result]
            print(f"Columns in students: {columns}")
            
            missing = ['resume_base64', 'resume_name', 'job_type']
            for m in missing:
                if m not in columns:
                    print(f"MISSING COLUMN: {m}")
    except Exception as e:
        print(f"Error checking DB: {e}")
