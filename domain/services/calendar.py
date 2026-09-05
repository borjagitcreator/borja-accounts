"""
Cálculos de calendario compartidos por KPIs, filtros de panel (Todo/6m/3m/
Mes/Año) y agregados (apuestas, inversiones, gastos...). Todo en
componentes de calendario *locales* -- nunca se pasa por UTC para decidir
a qué mes/año pertenece una fecha (ver el fix del bug de zona horaria en
domain/services/kpi.py).
"""
from datetime import datetime


def normalize_month(year: int, month0: int) -> tuple[int, int]:
    """month0 es 0-indexed y puede caer fuera de [0,11], igual que JS."""
    year += month0 // 12
    month0 = month0 % 12
    return year, month0


def calendar_month_start(reference_local: datetime, months_back: int) -> str:
    """'YYYY-MM-01' del mes que empieza `months_back` meses antes del de
    reference_local, en componentes locales."""
    year, month0 = normalize_month(reference_local.year, reference_local.month - 1 - months_back)
    return f"{year:04d}-{month0 + 1:02d}-01"


def month_key(reference_local: datetime, offset: int = 0) -> str:
    """'YYYY-MM' del mes que es `offset` meses respecto al de reference_local."""
    year, month0 = normalize_month(reference_local.year, reference_local.month - 1 + offset)
    return f"{year:04d}-{month0 + 1:02d}"
