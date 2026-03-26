"""merge_all_heads_2

Revision ID: 1dbe0a28621d
Revises: 4d36eb27f786
Create Date: 2026-03-26 18:55:19.252816

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dbe0a28621d'
down_revision: Union[str, None] = '4d36eb27f786'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
