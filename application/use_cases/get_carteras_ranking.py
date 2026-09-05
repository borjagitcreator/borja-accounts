from datetime import datetime

from domain.services.carteras_ranking import compute_carteras_ranking


class GetCarterasRankingUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None,
                reference: datetime, mode: str) -> dict:
        movements = self.repository.load(account_id)
        return compute_carteras_ranking(movements, range_type, year, reference, mode)
