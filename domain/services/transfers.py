"""
Traducción de isTransferIn/isTransferOut (index.html): detección de
transferencias Openbank<->IBKR por heurística de texto sobre `Concepto` --
no hay una relación explícita todavía (un `transfer_link_id` real es
decisión de un bloque posterior, ver docs/ARCHITECTURE.md). Se reproduce
tal cual, heurística incluida.
"""
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
