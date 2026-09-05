"""Traducción de la parte de cálculo de chartMensual (index.html, cuenta Openbank)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from domain.entities import Movement
from domain.services.period_filter import filter_by_field
from domain.value_objects import TIPOS_NEGATIVOS, TIPOS_POSITIVOS

TZ = ZoneInfo("Europe/Madrid")


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


def _r2(v: float) -> float:
    return round(v, 2)


def compute_mensual(movements: list[Movement], range_type: str, year: int | None, reference: datetime) -> dict:
    reference_local = reference.astimezone(TZ)
    filtered = filter_by_field(movements, _fecha_str, range_type, year, reference_local)

    by_mes: dict[str, dict[str, float]] = {}
    for m in filtered:
        ym = _fecha_str(m)[:7]
        entry = by_mes.setdefault(ym, {"ing": 0.0, "gas": 0.0})
        if m.type in TIPOS_POSITIVOS and m.type != "Saldo Inicial":
            entry["ing"] += m.amount
        elif m.type in TIPOS_NEGATIVOS:
            entry["gas"] += m.amount

    meses = sorted(by_mes.keys())
    ingresos = [_r2(by_mes[m]["ing"]) for m in meses]
    gastos = [_r2(by_mes[m]["gas"]) for m in meses]
    balance = [_r2(ingresos[i] - gastos[i]) for i in range(len(meses))]

    return {"meses": meses, "ingresos": ingresos, "gastos": gastos, "balance": balance}
