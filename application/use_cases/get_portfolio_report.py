from datetime import datetime
from zoneinfo import ZoneInfo

from domain.services.period_filter import filter_by_field
from domain.services.positions import compute_closed_positions, compute_open_positions

TZ = ZoneInfo("Europe/Madrid")


class GetPortfolioReportUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None, reference: datetime) -> dict:
        reference_local = reference.astimezone(TZ)
        movements = self.repository.load(account_id)

        all_inv = [m for m in movements if m.type == "Inversión"]
        open_positions = sorted(
            compute_open_positions(movements, "Inversión", "Inversión_r"),
            key=lambda p: (p.monto, p.fi), reverse=True,
        )
        closed_all = compute_closed_positions(movements, "Inversión", "Inversión_r")
        closed_filtered = filter_by_field(closed_all, lambda c: c.fr, range_type, year, reference_local)

        total_inv = round(sum(m.amount for m in all_inv), 2)
        total_pnl = closed_all[-1].bal_h if closed_all else 0.0
        total_roi = closed_all[-1].pct_h if closed_all else 0.0
        open_total = round(sum(p.monto for p in open_positions), 2)

        return {
            "totalInv": total_inv,
            "totalCarteras": len(closed_all) + len(open_positions),
            "totalPnL": total_pnl,
            "totalRoi": total_roi,
            "closedCount": len(closed_all),
            "openCount": len(open_positions),
            "openTotal": open_total,
            "openPositions": [
                {"concepto": p.concepto, "fi": p.fi, "invertido": p.monto}
                for p in open_positions
            ],
            "closedPositions": [
                {
                    "Concepto": c.concepto, "fi": c.fi, "fr": c.fr,
                    "invertido": c.invertido, "devuelto": c.devuelto, "bal": c.bal,
                    "roi": c.pct, "balH": c.bal_h, "roiH": c.pct_h,
                }
                for c in closed_filtered
            ],
        }
