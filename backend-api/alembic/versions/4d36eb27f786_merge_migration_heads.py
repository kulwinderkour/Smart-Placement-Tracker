"""merge migration heads

Revision ID: 4d36eb27f786
Revises: add_roadmap_table, e1f2a3b4c5d6, f1a2b3c4d5e6
Create Date: 2026-03-26 09:12:13.111527

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d36eb27f786'
down_revision: Union[str, None] = ('add_roadmap_table', 'e1f2a3b4c5d6', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
