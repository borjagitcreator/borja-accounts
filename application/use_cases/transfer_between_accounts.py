from domain.entities import Movement
from domain.exceptions import InvalidTransferError
from domain.services.ledger import LedgerService

from .shared import parse_fecha, parse_total


class TransferBetweenAccountsUseCase:
    def __init__(self, repository, ledger: LedgerService, known_accounts):
        self.repository = repository
        self.ledger = ledger
        self.known_accounts = known_accounts

    def execute(self, data: dict) -> tuple[float, float]:
        origen = data.get("origen", "")
        destino = data.get("destino", "")
        if origen not in self.known_accounts or destino not in self.known_accounts or origen == destino:
            raise InvalidTransferError("Cuentas inválidas")

        total = parse_total(data)
        fecha = parse_fecha(data)

        # Prepara ambas listas completas antes de escribir ninguna — es la
        # única propiedad de atomicidad que tiene el adapter CSV.
        movs_o = self.repository.load(origen)
        nuevo_o = Movement(account_id=origen, occurred_at=fecha, type="Transferencia",
                            concept=f"A {destino.upper()}", amount=total)
        movs_o = self.ledger.recalculate_balances(sorted(movs_o + [nuevo_o], key=lambda m: m.occurred_at))

        movs_d = self.repository.load(destino)
        nuevo_d = Movement(account_id=destino, occurred_at=fecha, type="Ingreso",
                            concept=f"Desde {origen.upper()}", amount=total)
        movs_d = self.ledger.recalculate_balances(sorted(movs_d + [nuevo_d], key=lambda m: m.occurred_at))

        self.repository.save(origen, movs_o)
        self.repository.save(destino, movs_d)

        return movs_o[-1].balance, movs_d[-1].balance
