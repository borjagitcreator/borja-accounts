"""
Adapter SQLite del puerto MovementRepository (mismo puerto que
infrastructure/persistence/csv/repository.py). Reemplaza el CSV como store
activo -- ver docs/ARCHITECTURE.md Bloque 3.

`db_path` es un argumento obligatorio, sin default: un valor por defecto
aquí facilitaría que un harness o script mal configurado abriera sin
darse cuenta la base de datos real en vez de una de prueba.
"""
import sqlite3
import uuid

import pandas as pd

from domain.entities import Movement

from .schema import ensure_schema

_DATE_FORMAT = "%Y-%m-%d %H:%M:%S.%f"


class SQLiteMovementRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
        with self._connect() as conn:
            ensure_schema(conn)

    def _connect(self):
        conn = sqlite3.connect(self.db_path, isolation_level=None)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def load(self, account_id: str) -> list[Movement]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, account_id, occurred_at, type, concept, amount, balance, rowid "
                "FROM movements WHERE account_id = ? ORDER BY occurred_at, rowid",
                (account_id,),
            ).fetchall()
        return [
            Movement(
                id=uuid.UUID(r[0]),
                account_id=r[1],
                occurred_at=pd.Timestamp(r[2]),
                type=r[3],
                concept=r[4],
                amount=r[5],
                balance=r[6],
            )
            for r in rows
        ]

    def save(self, account_id: str, movements: list[Movement]) -> None:
        with self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            try:
                conn.execute("DELETE FROM movements WHERE account_id = ?", (account_id,))
                conn.executemany(
                    "INSERT INTO movements (id, account_id, occurred_at, type, concept, amount, balance) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        (
                            str(m.id), m.account_id, m.occurred_at.strftime(_DATE_FORMAT),
                            m.type, m.concept, m.amount, m.balance,
                        )
                        for m in movements
                    ],
                )
            except Exception:
                conn.execute("ROLLBACK")
                raise
            else:
                conn.execute("COMMIT")
