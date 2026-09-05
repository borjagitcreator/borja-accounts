from datetime import datetime
from zoneinfo import ZoneInfo

from domain.services.period_filter import filter_by_field
from domain.services.positions import compute_closed_positions, compute_open_positions

TZ = ZoneInfo("Europe/Madrid")


class GetBettingReportUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None, reference: datetime) -> dict:
        reference_local = reference.astimezone(TZ)
        movements = self.repository.load(account_id)

        all_bets = [m for m in movements if m.type == "Apuestas"]
        open_positions = sorted(
            compute_open_positions(movements, "Apuestas", "Apuestas_r"),
            key=lambda p: p.fi, reverse=True,
        )
        closed_all = compute_closed_positions(movements, "Apuestas", "Apuestas_r")
        closed_filtered = filter_by_field(closed_all, lambda c: c.fr, range_type, year, reference_local)

        total_apostado = round(sum(m.amount for m in all_bets), 2)
        total_pnl = closed_all[-1].bal_h if closed_all else 0.0
        wins = sum(1 for c in closed_all if c.bal > 0)
        win_rate = round(wins / len(closed_all) * 100, 2) if closed_all else 0.0
        open_total = round(sum(p.monto for p in open_positions), 2)

        return {
            "totalBets": len(all_bets),
            "totalApostado": total_apostado,
            "totalPnL": total_pnl,
            "wins": wins,
            "closedCount": len(closed_all),
            "winRate": win_rate,
            "openCount": len(open_positions),
            "openTotal": open_total,
            "openPositions": [
                {"concepto": p.concepto, "fi": p.fi, "banca": p.monto}
                for p in open_positions
            ],
            "closedPositions": [
                {
                    "Concepto": c.concepto, "fi": c.fi, "fr": c.fr,
                    "banca": c.invertido, "devuelto": c.devuelto, "bal": c.bal,
                    "crec": c.pct, "balH": c.bal_h, "crecH": c.pct_h,
                }
                for c in closed_filtered
            ],
        }
