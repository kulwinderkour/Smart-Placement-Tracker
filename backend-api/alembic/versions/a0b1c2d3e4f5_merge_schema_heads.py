"""merge_schema_heads

Revision ID: a0b1c2d3e4f5
Revises: 7da82da0abe5, e1f2a3b4c5d6
Create Date: 2026-04-21 10:00:00.000000

Merges two independent migration heads:
  - 7da82da0abe5 (sync_all_schema_changes, Apr 11)
  - e1f2a3b4c5d6 (add_company_profile_id_to_jobs, Mar 25)

This is a pure merge migration — no schema changes.
Required before adding the drop_resume_base64 migration.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = ("7da82da0abe5", "e1f2a3b4c5d6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
