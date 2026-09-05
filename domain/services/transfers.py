"""
Traducción de isTransferIn/isTransferOut/ibkrTransfers (index.html):
detección de transferencias Openbank<->IBKR por heurística de texto sobre
`Concepto` -- no hay una relación explícita todavía (un `transfer_link_id`
real es decisión de un bloque posterior, ver docs/ARCHITECTURE.md). Se
reproduce tal cual, heurística incluida.
"""
from dataclasses import dataclass

from domain.entities import Movement


def is_transfer_in(m: Movement) -> bool:
    if m.type != "Ingreso":
        return False
    c = (m.concept or "").lower()
    return "desde openbank" in c or "desde ob" in c


def is_transfer_out(m: Movement) -> bool:
    if m.type == "Transferencia":
        return True
    c = (m.concept or "").lower()
    return "a openbank" in c or "a ob" in c


@dataclass
class TransferItem:
    fecha: str
    dir: str  # 'in' | 'out'
    label: str
    concepto: str
    total: float


def list_transfers(movements: list[Movement]) -> list[TransferItem]:
    items = []
    for m in movements:
        if is_transfer_in(m):
            items.append(TransferItem(
                fecha=m.occurred_at.strftime("%Y-%m-%d %H:%M:%S"), dir="in",
                label="← Openbank", concepto=m.concept, total=m.amount,
            ))
        elif is_transfer_out(m):
            items.append(TransferItem(
                fecha=m.occurred_at.strftime("%Y-%m-%d %H:%M:%S"), dir="out",
                label="→ Openbank", concepto=m.concept, total=m.amount,
            ))
    items.sort(key=lambda t: t.fecha, reverse=True)
    return items
