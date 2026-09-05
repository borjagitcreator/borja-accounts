from datetime import datetime
from zoneinfo import ZoneInfo

from domain.services.period_filter import filter_by_field
from domain.services.transfers import list_transfers

TZ = ZoneInfo("Europe/Madrid")


class GetTransfersReportUseCase:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, account_id: str, range_type: str, year: int | None, reference: datetime) -> dict:
        reference_local = reference.astimezone(TZ)
        movements = self.repository.load(account_id)

        all_xfer = list_transfers(movements)
        lifetime_rec = round(sum(t.total for t in all_xfer if t.dir == "in"), 2)
        lifetime_sent = round(sum(t.total for t in all_xfer if t.dir == "out"), 2)
        lifetime_net = round(lifetime_rec - lifetime_sent, 2)

        filtered = filter_by_field(all_xfer, lambda t: t.fecha, range_type, year, reference_local)

        return {
            "lifetimeRec": lifetime_rec,
            "lifetimeSent": lifetime_sent,
            "lifetimeNet": lifetime_net,
            "totalCount": len(all_xfer),
            "items": [
                {"Fecha": t.fecha, "dir": t.dir, "label": t.label, "Concepto": t.concepto, "Total": t.total}
                for t in filtered[:30]
            ],
        }
