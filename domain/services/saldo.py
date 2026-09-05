"""Traducción de la parte de cálculo de chartSaldo/rollingMean (index.html)."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from domain.entities import Movement
from domain.services.period_filter import filter_by_field

TZ = ZoneInfo("Europe/Madrid")


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


def _rolling_mean(dates: list[str], values: list[float], days: int) -> list[float]:
    """Traducción literal de rollingMean(): media móvil de `days` días
    sobre una serie ya ordenada ascendentemente, ventana [t-days, t].
    O(n²) igual que el original -- aceptable para los volúmenes de esta app."""
    parsed = [datetime.strptime(d, "%Y-%m-%d %H:%M:%S") for d in dates]
    window = timedelta(days=days)
    out = []
    for i in range(len(values)):
        cutoff = parsed[i] - window
        total = 0.0
        count = 0
        for j in range(i + 1):
            if parsed[j] >= cutoff:
                total += values[j]
                count += 1
        out.append(total / count if count else values[i])
    return out


def compute_saldo_evolucion(movements: list[Movement], range_type: str, year: int | None,
                             reference: datetime, with_media_movil: bool) -> dict:
    reference_local = reference.astimezone(TZ)
    filtered = filter_by_field(movements, _fecha_str, range_type, year, reference_local)
    filtered = sorted(filtered, key=_fecha_str)
    dates = [_fecha_str(m) for m in filtered]
    saldos = [m.balance for m in filtered]

    result = {"dates": dates, "saldos": saldos, "actual": saldos[-1] if saldos else 0.0}
    if with_media_movil:
        result["mediaMovil"] = _rolling_mean(dates, saldos, 30)
    return result
