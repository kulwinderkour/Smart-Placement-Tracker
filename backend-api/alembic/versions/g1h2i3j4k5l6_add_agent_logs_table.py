"""add agent_logs table for autonomous agent system

Revision ID: g1h2i3j4k5l6
Revises: e5f6a7b8c9d0
Create Date: 2026-04-27
"""
from typing import Union, Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL throughout to avoid SQLAlchemy enum DDL conflicts
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agent_type AS ENUM ('intent', 'resume', 'validation', 'auto_apply', 'cover_letter');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE agent_status AS ENUM ('started', 'success', 'failed', 'retry', 'recovered');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS agent_logs (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id  UUID REFERENCES students(id) ON DELETE SET NULL,
            session_id  UUID NOT NULL,
            agent_type  agent_type NOT NULL,
            step        VARCHAR(100) NOT NULL,
            status      agent_status NOT NULL,
            input_data  JSONB,
            output_data JSONB,
            extra_data  JSONB,
            error_message TEXT,
            error_type  VARCHAR(50),
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            duration_ms INTEGER,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_logs_student_id   ON agent_logs(student_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_logs_session_id   ON agent_logs(session_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_logs_created_at   ON agent_logs(created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_logs_student_type ON agent_logs(student_id, agent_type);")


def downgrade() -> None:
    op.drop_index('ix_agent_logs_student_type', 'agent_logs')
    op.drop_index('ix_agent_logs_created_at', 'agent_logs')
    op.drop_index('ix_agent_logs_session_id', 'agent_logs')
    op.drop_index('ix_agent_logs_student_id', 'agent_logs')
    op.drop_table('agent_logs')
    
    # Drop enums
    sa.Enum(name='agent_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='agent_status').drop(op.get_bind(), checkfirst=True)
