"""Add generated_questions table

Revision ID: c2d3e4f5a6b7
Revises: a8b9c0d1e2f3
Create Date: 2026-04-07 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'a8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS generated_questions (
            id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            question_key   TEXT        UNIQUE NOT NULL,
            title          TEXT,
            role           TEXT,
            topic          TEXT,
            difficulty     TEXT,
            question_type  TEXT,
            question_count INT,
            source_prompt  TEXT,
            payload        JSONB       NOT NULL,
            created_at     TIMESTAMPTZ DEFAULT now(),
            updated_at     TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_gq_key        ON generated_questions (question_key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_gq_role       ON generated_questions (role)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_gq_difficulty ON generated_questions (difficulty)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_gq_type       ON generated_questions (question_type)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_gq_type")
    op.execute("DROP INDEX IF EXISTS ix_gq_difficulty")
    op.execute("DROP INDEX IF EXISTS ix_gq_role")
    op.execute("DROP INDEX IF EXISTS ix_gq_key")
    op.drop_table('generated_questions')
