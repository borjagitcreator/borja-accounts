"""
Ranking por concepto (agrupar, media/mes o total, top-N) -- la parte de
cálculo que comparten chartGastos (Tipo=Gasto, top 20) y chartCarteras
(Tipo=Inversión, top 12) en index.html. Ambas eran el mismo algoritmo
duplicado sobre un tipo y un top-N distintos.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from domain.entities import Movement
from domain.services.period_filter import filter_by_field

TZ = ZoneInfo("Europe/Madrid")

_MONTHS_FOR_RANGE = {"1m": 1, "3m": 3, "6m": 6}


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


def _r2(v: float) -> float:
    return round(v, 2)


def _n_months(items: list[Movement], range_type: str) -> int:
    if range_type in (None, "all", "year"):
        return len({_fecha_str(m)[:7] for m in items}) or 1
    return _MONTHS_FOR_RANGE.get(range_type, 1)


def rank_by_concept(movements: list[Movement], tipo: str, range_type: str, year: int | None,
                     reference: datetime, mode: str, limit: int) -> tuple[list[tuple[str, float]], str, bool]:
    """Devuelve (entries, hover_suffix, has_items). entries ya en orden
    descendente y recortadas a `limit`; has_items indica si había algún
    movimiento de `tipo` tras aplicar el filtro de rango (independiente de
    si el ranking resultante quedó vacío por filtrar valores <= 0)."""
    reference_local = reference.astimezone(TZ)
    filtered = filter_by_field(movements, _fecha_str, range_type, year, reference_local)
    items = [m for m in filtered if m.type == tipo and m.amount is not None]
    hover_suffix = "€/mes" if mode == "media" else "€"
    if not items:
        return [], hover_suffix, False

    by_concepto: dict[str, float] = {}
    for m in items:
        by_concepto[m.concept] = by_concepto.get(m.concept, 0.0) + m.amount

    if mode == "media":
        n_months = _n_months(items, range_type)
        entries = [(c, _r2(t / n_months)) for c, t in by_concepto.items()]
    else:
        entries = [(c, _r2(t)) for c, t in by_concepto.items()]

    entries = [(c, v) for c, v in entries if v > 0]
    entries.sort(key=lambda kv: kv[1], reverse=True)
    return entries[:limit], hover_suffix, True
