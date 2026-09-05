"""Traducción de computeIbkrKPIs/openCarterasSnapshot (index.html)."""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from domain.entities import Movement
from domain.services.period_slices import period_slices
from domain.services.positions import compute_closed_positions, compute_open_positions
from domain.services.transfers import is_transfer_in, is_transfer_out

TZ = ZoneInfo("Europe/Madrid")


def _r2(v: float) -> float:
    return round(v, 2)


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


@dataclass
class Delta:
    diff: float


@dataclass
class IbkrKPIResult:
    saldo: float
    aportado: float
    aportado_delta: Delta
    en_carteras: float
    en_carteras_count: int
    pnl: float
    pnl_delta: Delta


def _delta(curr: float, prv: float) -> Delta:
    return Delta(diff=_r2(curr - prv))


def compute_ibkr_kpis(movements: list[Movement], kpi_type: str, reference: datetime) -> IbkrKPIResult:
    reference_local = reference.astimezone(TZ)
    saldo = movements[-1].balance if movements else 0.0
    slices = period_slices(kpi_type, reference_local)

    open_positions = compute_open_positions(movements, "Inversión", "Inversión_r")
    en_carteras = _r2(sum(p.monto for p in open_positions))
    en_carteras_count = len(open_positions)

    def aportado(rs):
        rec = sum(m.amount for m in rs if is_transfer_in(m))
        sent = sum(m.amount for m in rs if is_transfer_out(m))
        return _r2(rec - sent)

    curr_a = aportado([m for m in movements if slices.in_curr(_fecha_str(m))])
    prv_a = aportado([m for m in movements if slices.in_prv(_fecha_str(m))])

    closed = compute_closed_positions(movements, "Inversión", "Inversión_r")

    def pnl(items):
        return _r2(sum(c.bal for c in items))

    curr_p = pnl([c for c in closed if slices.in_curr(c.fr)])
    prv_p = pnl([c for c in closed if slices.in_prv(c.fr)])

    return IbkrKPIResult(
        saldo=saldo,
        aportado=curr_a, aportado_delta=_delta(curr_a, prv_a),
        en_carteras=en_carteras, en_carteras_count=en_carteras_count,
        pnl=curr_p, pnl_delta=_delta(curr_p, prv_p),
    )
