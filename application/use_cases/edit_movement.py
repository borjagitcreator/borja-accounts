from domain.exceptions import (
    InvalidMovementIndexError,
    MovementNotFoundError,
    ProtectedInitialBalanceError,
)
from domain.services.ledger import LedgerService

from .shared import parse_total


class EditMovementUseCase:
    def __init__(self, repository, ledger: LedgerService):
        self.repository = repository
        self.ledger = ledger

    def execute(self, account_id: str, data: dict) -> float:
        try:
            idx = int(data["idx"])
        except (KeyError, TypeError, ValueError):
            raise InvalidMovementIndexError("Índice de movimiento inválido")

        tipo = data.get("tipo", "")
        concepto = (data.get("concepto") or "").strip()
        total = parse_total(data)

        movements = self.repository.load(account_id)
        if idx < 0 or idx >= len(movements):
            raise MovementNotFoundError("Movimiento no encontrado")

        objetivo = movements[idx]
        if objetivo.type == "Saldo Inicial":
            raise ProtectedInitialBalanceError("No se puede editar el saldo inicial")

        self.ledger.validate_type_and_concept(account_id, movements, tipo, concepto, exclude_id=objetivo.id)

        objetivo.type = tipo
        objetivo.concept = concepto
        objetivo.amount = total
        movements = self.ledger.recalculate_balances(movements)
        self.repository.save(account_id, movements)

        return movements[-1].balance
