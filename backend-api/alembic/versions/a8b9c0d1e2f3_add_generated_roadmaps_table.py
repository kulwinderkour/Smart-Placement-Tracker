"""Add generated_roadmaps table

Revision ID: a8b9c0d1e2f3
Revises: 2b2738e5c4af
Create Date: 2026-04-07 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, None] = '2b2738e5c4af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS generated_roadmaps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            roadmap_key TEXT UNIQUE NOT NULL,
            title TEXT,
            role TEXT NOT NULL,
            level TEXT,
            duration_weeks INTEGER,
            source_prompt TEXT,
            payload JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_generated_roadmaps_key ON generated_roadmaps (roadmap_key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_generated_roadmaps_role ON generated_roadmaps (role)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_generated_roadmaps_role")
    op.execute("DROP INDEX IF EXISTS ix_generated_roadmaps_key")
    op.drop_table('generated_roadmaps')
