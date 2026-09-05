from datetime import datetime

from domain.services.kpi import KPIResult, compute_kpis


class GetAccountKPIsUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, kpi_type: str, reference: datetime) -> KPIResult:
        movements = self.repository.load(account_id)
        return compute_kpis(movements, kpi_type, reference)
