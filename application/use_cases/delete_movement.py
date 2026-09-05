from domain.exceptions import ProtectedInitialBalanceError
from domain.services.ledger import LedgerService


class DeleteMovementUseCase:
    def __init__(self, repository, ledger: LedgerService):
        self.repository = repository
        self.ledger = ledger

    def execute(self, account_id: str) -> tuple[dict, float]:
        movements = self.repository.load(account_id)
        if len(movements) <= 1:
            raise ProtectedInitialBalanceError("No se puede borrar el saldo inicial")

        ultimo = movements[-1]
        eliminado = {
            "fecha": str(ultimo.occurred_at),
            "tipo": ultimo.type,
            "concepto": ultimo.concept,
            "total": float(ultimo.amount),
        }

        movements = movements[:-1]
        movements = self.ledger.recalculate_balances(movements)
        self.repository.save(account_id, movements)

        return eliminado, movements[-1].balance
