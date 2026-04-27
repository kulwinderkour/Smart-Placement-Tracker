"""add missing student dob and gender columns

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9, f3a4b5c6d7e8
Create Date: 2026-04-27
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = ("d4e5f6a7b8c9", "f3a4b5c6d7e8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR(20)")
    op.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(20)")


def downgrade() -> None:
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS gender")
    op.execute("ALTER TABLE students DROP COLUMN IF EXISTS dob")
