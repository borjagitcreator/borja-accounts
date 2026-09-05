"""
Traducción fusionada de computeApuestas/computeInversiones y de las
posiciones abiertas que calculaba inline apuestasBody/inversionesBody
(index.html) -- son el mismo algoritmo sobre distinto par de Tipo
(Apuestas/Apuestas_r, Inversión/Inversión_r), tal como ya apuntaba la
comparación 1:1 en docs/ARCHITECTURE.md.
"""
from dataclasses import dataclass

from domain.entities import Movement


def _fecha_str(m: Movement) -> str:
    return m.occurred_at.strftime("%Y-%m-%d %H:%M:%S")


def _r2(v: float) -> float:
    return round(v, 2)


def _group_by_concept(movements: list[Movement]) -> dict[str, list[Movement]]:
    groups: dict[str, list[Movement]] = {}
    for m in movements:
        groups.setdefault(m.concept, []).append(m)
    return groups


def _sum_amount(movements: list[Movement]) -> float:
    return sum(m.amount for m in movements)


def _min_fecha(movements: list[Movement]) -> str:
    return min((_fecha_str(m) for m in movements), default="")


def _max_fecha(movements: list[Movement]) -> str:
    return max((_fecha_str(m) for m in movements), default="")


@dataclass
class ClosedPosition:
    concepto: str
    fi: str
    fr: str
    invertido: float
    devuelto: float
    bal: float
    pct: float
    bal_h: float = 0.0
    pct_h: float = 0.0


@dataclass
class OpenPosition:
    concepto: str
    fi: str
    monto: float


def compute_closed_positions(movements: list[Movement], open_type: str, close_type: str) -> list[ClosedPosition]:
    relevant = [m for m in movements if m.type in (open_type, close_type)]
    groups = _group_by_concept(relevant)
    out = []
    for concepto, rs in groups.items():
        abiertos = [m for m in rs if m.type == open_type]
        cierres = [m for m in rs if m.type == close_type]
        if not cierres:
            continue
        invertido = _sum_amount(abiertos)
        devuelto = _sum_amount(cierres)
        bal = _r2(devuelto - invertido)
        pct = _r2(bal / invertido * 100) if invertido > 0 else 0.0
        out.append(ClosedPosition(
            concepto=concepto, fi=_min_fecha(abiertos), fr=_max_fecha(cierres),
            invertido=_r2(invertido), devuelto=_r2(devuelto), bal=bal, pct=pct,
        ))
    out.sort(key=lambda r: r.fr)
    bal_h = 0.0
    acum = 0.0
    for r in out:
        bal_h = _r2(bal_h + r.bal)
        acum = _r2(acum + r.invertido)
        r.bal_h = bal_h
        r.pct_h = _r2(bal_h / acum * 100) if acum > 0 else 0.0
    return out


def compute_open_positions(movements: list[Movement], open_type: str, close_type: str) -> list[OpenPosition]:
    """Sin ordenar -- apuestas e inversiones ordenan sus posiciones abiertas
    con criterios distintos (ver GetBettingReportUseCase/GetPortfolioReportUseCase),
    igual que ya hacían apuestasBody/inversionesBody en index.html."""
    abiertos = [m for m in movements if m.type == open_type]
    closed_concepts = {m.concept for m in movements if m.type == close_type}
    open_movs = [m for m in abiertos if m.concept not in closed_concepts]
    groups = _group_by_concept(open_movs)
    return [
        OpenPosition(concepto=c, fi=_min_fecha(rs), monto=_r2(_sum_amount(rs)))
        for c, rs in groups.items()
    ]
