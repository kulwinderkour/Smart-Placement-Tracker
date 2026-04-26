"""add_application_tracker_columns

Revision ID: d4e5f6a7b8c9
Revises: 7da82da0abe5
Create Date: 2026-04-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "7da82da0abe5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("user_id", sa.UUID(), nullable=True))
    op.add_column("applications", sa.Column("job_title", sa.Text(), nullable=True))
    op.add_column("applications", sa.Column("company", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_applications_user_id_users",
        "applications",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_applications_user_id_users", "applications", type_="foreignkey")
    op.drop_column("applications", "company")
    op.drop_column("applications", "job_title")
    op.drop_column("applications", "user_id")
