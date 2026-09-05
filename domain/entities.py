import uuid
from dataclasses import dataclass, field
from datetime import datetime

from domain.value_objects import AccountKind


@dataclass
class Movement:
    account_id: str
    occurred_at: datetime
    type: str
    concept: str
    amount: float
    balance: float = 0.0
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class Account:
    id: str
    name: str
    kind: AccountKind
    currency: str = "EUR"
