from datetime import datetime

from domain.services.saldo import compute_saldo_evolucion


class GetSaldoEvolucionUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None, reference: datetime) -> dict:
        movements = self.repository.load(account_id)
        # Media móvil solo en Openbank (cuenta activa); en IBKR sobra --
        # misma decisión que hoy toma chartSaldo() según `account`.
        with_media_movil = account_id == "openbank"
        return compute_saldo_evolucion(movements, range_type, year, reference, with_media_movil)
