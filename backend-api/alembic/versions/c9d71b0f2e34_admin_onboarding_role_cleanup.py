"""admin_onboarding_role_cleanup

Revision ID: c9d71b0f2e34
Revises: b7f4d2c9a1e0
Create Date: 2026-03-23 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c9d71b0f2e34"
down_revision: Union[str, None] = "b7f4d2c9a1e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Backfill from legacy column if present.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_company_profile_completed'
            ) THEN
                UPDATE users
                SET is_onboarding_completed = is_company_profile_completed;
            END IF;
        END
        $$;
        """
    )

    # Map old provider users to admin before shrinking enum values.
    op.execute("UPDATE users SET role = 'admin' WHERE role::text = 'provider';")

    # Recreate enum with only student/admin.
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE text;")
    op.execute("DROP TYPE IF EXISTS userrole;")
    op.execute("CREATE TYPE userrole AS ENUM ('student', 'admin');")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole;")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE text;")
    op.execute("DROP TYPE IF EXISTS userrole;")
    op.execute("CREATE TYPE userrole AS ENUM ('student', 'admin', 'provider');")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole;")

    op.drop_column("users", "is_onboarding_completed")
