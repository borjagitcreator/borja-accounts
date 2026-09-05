from domain.entities import Movement
from domain.services.ledger import LedgerService

from .shared import parse_fecha, parse_total


class AddMovementUseCase:
    def __init__(self, repository, ledger: LedgerService):
        self.repository = repository
        self.ledger = ledger

    def execute(self, account_id: str, data: dict) -> float:
        tipo = data.get("tipo", "")
        concepto = (data.get("concepto") or "").strip()
        total = parse_total(data)
        fecha = parse_fecha(data)

        movements = self.repository.load(account_id)
        self.ledger.validate_type_and_concept(account_id, movements, tipo, concepto)

        nuevo = Movement(account_id=account_id, occurred_at=fecha, type=tipo, concept=concepto, amount=total)
        movements = sorted(movements + [nuevo], key=lambda m: m.occurred_at)
        movements = self.ledger.recalculate_balances(movements)
        self.repository.save(account_id, movements)

        return movements[-1].balance
