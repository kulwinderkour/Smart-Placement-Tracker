"""add_company_profile

Revision ID: a1b2c3d4e5f6
Revises: 9725b1674e53
Create Date: 2026-03-23 01:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9725b1674e53"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_company_profile_completed column to users
    op.add_column(
        "users",
        sa.Column(
            "is_company_profile_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Create company_profiles table
    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=False),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("company_email", sa.String(length=255), nullable=True),
        sa.Column("hr_contact_number", sa.String(length=20), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("industry_type", sa.String(length=100), nullable=True),
        sa.Column("company_size", sa.String(length=50), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("is_draft", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("company_profiles")
    op.drop_column("users", "is_company_profile_completed")
