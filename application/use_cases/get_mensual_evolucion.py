from datetime import datetime

from domain.services.mensual import compute_mensual


class GetMensualEvolucionUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None, reference: datetime) -> dict:
        movements = self.repository.load(account_id)
        return compute_mensual(movements, range_type, year, reference)
