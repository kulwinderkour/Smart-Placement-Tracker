"""merge_all_heads_2

Revision ID: 764aee2ac6b2
Revises: 00188da8dec0
Create Date: 2026-03-26 19:23:35.118610

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '764aee2ac6b2'
down_revision: Union[str, None] = '00188da8dec0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
