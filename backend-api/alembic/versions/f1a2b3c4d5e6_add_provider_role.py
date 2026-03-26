"""add provider to userrole enum

Revision ID: f1a2b3c4d5e6
Revises: c9d71b0f2e34
Create Date: 2026-03-25

"""
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "c9d71b0f2e34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'provider'")


def downgrade() -> None:
    pass
