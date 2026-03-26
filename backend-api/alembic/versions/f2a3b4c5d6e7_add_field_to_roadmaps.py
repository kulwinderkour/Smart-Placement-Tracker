"""add_field_to_roadmaps

Revision ID: f2a3b4c5d6e7
Revises: add_roadmap_table
Create Date: 2026-03-26 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'add_roadmap_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS field VARCHAR(255) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS title VARCHAR(500) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS description TEXT")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50)")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS generated_by VARCHAR(100)")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS usage_count BIGINT DEFAULT 0")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ")
    op.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS is_public VARCHAR(10) DEFAULT 'true'")
    op.execute("CREATE INDEX IF NOT EXISTS ix_roadmaps_field ON roadmaps (field)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_roadmaps_title ON roadmaps (title)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_roadmaps_difficulty_level ON roadmaps (difficulty_level)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_roadmaps_difficulty_level")
    op.execute("DROP INDEX IF EXISTS ix_roadmaps_title")
    op.execute("DROP INDEX IF EXISTS ix_roadmaps_field")
    op.drop_column('roadmaps', 'is_public')
    op.drop_column('roadmaps', 'last_accessed')
    op.drop_column('roadmaps', 'usage_count')
    op.drop_column('roadmaps', 'generated_by')
    op.drop_column('roadmaps', 'difficulty_level')
    op.drop_column('roadmaps', 'description')
    op.drop_column('roadmaps', 'title')
    op.drop_column('roadmaps', 'field')
