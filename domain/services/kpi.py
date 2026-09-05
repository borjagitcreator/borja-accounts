"""
Traducción literal de computeKPIs / calendarMonthStart / monthKey / periodSlices
(index.html) al backend -- Bloque 4 del refactor.

Preserva a propósito un bug real de zona horaria (ver docs/ARCHITECTURE.md y
tests/golden_master/README.md): `pm` (periodo anterior, rama kpi_type="mes")
reproduce `new Date(y, m, 1).toISOString().slice(0,7)` bajo Europe/Madrid,
que con un TZ de offset positivo puede resolver al mes anterior al que
realmente corresponde. Corregirlo es un commit aparte y deliberado, no este.

`reference` (instante UTC) sustituye a `new Date()`/`datetime.now()`: nunca
se lee el reloj real aquí, se recibe explícito desde el caso de uso -- así
el resultado es reproducible en el golden master sin importar cuándo se
ejecute.
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from domain.entities import Movement
from domain.value_objects import TIPOS_NEGATIVOS, TIPOS_POSITIVOS

TZ = ZoneInfo("Europe/Madrid")
UTC = ZoneInfo("UTC")

TIPOS_KPI_ING = {"Nómina", "Ingreso", "Devolución"}
TIPOS_KPI_GAS = {"Gasto", "Transferencia"}


def _r2(v: float) -> float:
    return round(v, 2)


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


def _normalize_month(year: int, month0: int) -> tuple[int, int]:
    """month0 es 0-indexed y puede caer fuera de [0,11], igual que JS."""
    year += month0 // 12
    month0 = month0 % 12
    return year, month0


def calendar_month_start(reference_local: datetime, months_back: int) -> str:
    """Sin bug: usa directamente los componentes locales del instante
    (equivalente a los getters de un mismo objeto Date, sin pasar por
    toISOString/UTC)."""
    year, month0 = _normalize_month(reference_local.year, reference_local.month - 1 - months_back)
    return f"{year:04d}-{month0 + 1:02d}-01"


def _month_key_with_tz_bug(local_year: int, local_month0: int, offset: int) -> str:
    """new Date(year, month0+offset, 1).toISOString().slice(0,7): construye
    medianoche LOCAL (Europe/Madrid) a partir de componentes locales y la
    convierte a UTC -- el paso que introduce el bug."""
    year, month0 = _normalize_month(local_year, local_month0 + offset)
    local_midnight = datetime(year, month0 + 1, 1, tzinfo=TZ)
    utc = local_midnight.astimezone(UTC)
    return f"{utc.year:04d}-{utc.month:02d}"


def _sum_period(movements: list[Movement], in_period) -> dict:
    ing = gas = bal_ing = bal_gas = 0.0
    for m in movements:
        if not in_period(m):
            continue
        if m.type in TIPOS_KPI_ING:
            ing += m.amount
        if m.type in TIPOS_KPI_GAS:
            gas += m.amount
        if m.type in TIPOS_POSITIVOS and m.type != "Saldo Inicial":
            bal_ing += m.amount
        elif m.type in TIPOS_NEGATIVOS:
            bal_gas += m.amount
    return {"ingresos": _r2(ing), "gastos": _r2(gas), "balance": _r2(bal_ing - bal_gas)}


@dataclass
class PeriodDelta:
    diff: float


@dataclass
class KPIResult:
    saldo: float
    ingresos: float
    ingresos_delta: PeriodDelta
    gastos: float
    gastos_delta: PeriodDelta
    balance: float
    balance_delta: PeriodDelta


def _delta(curr: float, prv: float) -> PeriodDelta:
    return PeriodDelta(diff=_r2(curr - prv))


def compute_kpis(movements: list[Movement], kpi_type: str, reference: datetime) -> KPIResult:
    """reference: instante UTC (tz-aware). kpi_type: 'mes' (default) |
    'trimestre' | 'año'."""
    saldo = movements[-1].balance if movements else 0.0
    reference_local = reference.astimezone(TZ)

    if kpi_type == "trimestre":
        cut = calendar_month_start(reference_local, 2)
        cut2 = calendar_month_start(reference_local, 5)
        curr = _sum_period(movements, lambda m: _fecha_str(m) >= cut)
        prv = _sum_period(movements, lambda m: cut2 <= _fecha_str(m) < cut)
    elif kpi_type == "año":
        y = str(reference_local.year)
        py = str(reference_local.year - 1)
        curr = _sum_period(movements, lambda m: _fecha_str(m).startswith(y))
        prv = _sum_period(movements, lambda m: _fecha_str(m).startswith(py))
    else:
        m_key = reference.strftime("%Y-%m")  # sin bug: instante directo en UTC
        pm_key = _month_key_with_tz_bug(reference_local.year, reference_local.month - 1, -1)
        curr = _sum_period(movements, lambda m: _fecha_str(m)[:7] == m_key)
        prv = _sum_period(movements, lambda m: _fecha_str(m)[:7] == pm_key)

    return KPIResult(
        saldo=saldo,
        ingresos=curr["ingresos"], ingresos_delta=_delta(curr["ingresos"], prv["ingresos"]),
        gastos=curr["gastos"], gastos_delta=_delta(curr["gastos"], prv["gastos"]),
        balance=curr["balance"], balance_delta=_delta(curr["balance"], prv["balance"]),
    )
