from typing import Protocol

from domain.entities import Movement


class MovementRepository(Protocol):
    def load(self, account_id: str) -> list[Movement]:
        """Devuelve los movimientos de la cuenta, ordenados por fecha
        (mergesort estable). Lanza una excepción de infraestructura si la
        cuenta no tiene datos o no se pueden leer."""
        ...

    def save(self, account_id: str, movements: list[Movement]) -> None:
        """Persiste la lista completa de movimientos en el orden dado."""
        ...
