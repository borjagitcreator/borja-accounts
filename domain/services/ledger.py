"""
Invariantes del "libro mayor" de una cuenta: recálculo de saldo y validación
tipo/concepto. Traducido literalmente desde app.py (Flask) — no importa
pandas, FastAPI ni nada de application/infrastructure: es dominio puro,
testeable sin un framework HTTP ni un DataFrame de por medio.
"""
from domain.entities import Movement
from domain.exceptions import (
    AlreadyClosedBetError,
    EmptyConceptError,
    InvalidMovementTypeError,
    MissingSourceMovementError,
)
from domain.value_objects import TIPOS_POR_CUENTA, TIPOS_POSITIVOS


class LedgerService:
    def __init__(self, positive_types=TIPOS_POSITIVOS, types_by_account=TIPOS_POR_CUENTA):
        self.positive_types = positive_types
        self.types_by_account = types_by_account

    def recalculate_balances(self, movements: list[Movement]) -> list[Movement]:
        """Barrido completo desde cero, en el orden dado (el llamador es
        responsable de ordenar por fecha antes). Redondeo por fila, no del
        acumulador — preserva el comportamiento exacto de recalcular_saldo()
        del app.py original."""
        saldo = 0.0
        for m in movements:
            saldo += m.amount if m.type in self.positive_types else -m.amount
            m.balance = round(saldo, 2)
        return movements

    def validate_type_and_concept(self, cuenta: str, movements: list[Movement], tipo: str, concepto: str,
                                   exclude_id=None) -> None:
        """Lanza una DomainError si la combinación tipo/concepto no es válida
        para esta cuenta. exclude_id excluye ese movimiento de la comprobación
        (útil al editar)."""
        if tipo not in self.types_by_account.get(cuenta, []):
            raise InvalidMovementTypeError(f"Tipo '{tipo}' no válido para esta cuenta")
        if not concepto:
            raise EmptyConceptError("El concepto no puede estar vacío")

        check = movements if exclude_id is None else [m for m in movements if m.id != exclude_id]

        if tipo == "Devolución":
            if not any(m.type == "Gasto" and m.concept == concepto for m in check):
                raise MissingSourceMovementError(f"No existe 'Gasto' con concepto '{concepto}'")
        elif tipo in ("Inversión_r", "Apuestas_r"):
            tipo_origen = "Inversión" if tipo == "Inversión_r" else "Apuestas"
            if not any(m.type == tipo_origen and m.concept == concepto for m in check):
                raise MissingSourceMovementError(f"No existe '{tipo_origen}' con concepto '{concepto}'")
            if tipo == "Apuestas_r" and any(m.type == "Apuestas_r" and m.concept == concepto for m in check):
                raise AlreadyClosedBetError(f"La apuesta '{concepto}' ya tiene retorno registrado")
