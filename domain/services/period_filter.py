"""
Traducción de filterCutoff/rowInFilter/applyFilter/applyFilterByCloseDate
(index.html): el filtro de panel compartido por apuestas, inversiones,
gastos, mensual, saldo y transferencias -- "Todo" / "6 meses" / "3 meses" /
"Mes" / un año concreto. Meses de calendario, no ventanas rodantes.
"""
from datetime import datetime

from domain.services.calendar import calendar_month_start

_MONTHS_BACK = {"1m": 0, "3m": 2, "6m": 5}


def filter_cutoff(range_type: str, year: int | None, reference_local: datetime):
    """Devuelve None (sin filtro, range_type == 'all'), o una tupla
    ('year', 'YYYY') / ('from', 'YYYY-MM-DD')."""
    if range_type == "all" or range_type is None:
        return None
    if range_type == "year":
        return ("year", str(year))
    months_back = _MONTHS_BACK.get(range_type)
    if months_back is None:
        return None
    return ("from", calendar_month_start(reference_local, months_back))


def row_in_filter(fecha_str: str, cutoff) -> bool:
    if cutoff is None:
        return True
    mode, value = cutoff
    if mode == "year":
        return fecha_str.startswith(value)
    return fecha_str >= value


def filter_by_field(items, fecha_getter, range_type: str, year: int | None, reference_local: datetime) -> list:
    cutoff = filter_cutoff(range_type, year, reference_local)
    if cutoff is None:
        return list(items)
    return [it for it in items if row_in_filter(fecha_getter(it), cutoff)]
