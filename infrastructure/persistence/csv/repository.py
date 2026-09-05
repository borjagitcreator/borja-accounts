"""
Adapter CSV del puerto MovementRepository. Traducción literal de
cargar()/guardar() (app.py original): mismo formato de fecha
(%Y-%m-%d %H:%M:%S.%f), misma escritura atómica (tempfile + os.replace),
mismo mergesort estable. Transitorio — lo reemplaza SQLiteMovementRepository
en el Bloque 3; ambos implementan el mismo puerto.

Movement.id se genera en memoria al cargar (uuid4), nunca se escribe al
CSV: en este bloque la identidad solo necesita ser estable dentro de una
misma request (cargar → mutar → recalcular → guardar), no sobrevivir a un
ciclo de guardado. Ver docs/ARCHITECTURE.md — persistir el id real es
decisión del Bloque 3, cuando el esquema relacional ya tiene `movements.id`
como PK.
"""
import os
import tempfile
import uuid

import pandas as pd

from domain.entities import Movement

ARCHIVOS = {
    "openbank": "openbank.csv",
    "ibkr": "ibkr.csv",
}


class AccountDataNotFoundError(Exception):
    pass


class AccountDataReadError(Exception):
    pass


class CSVMovementRepository:
    def __init__(self, archivos: dict[str, str] = ARCHIVOS):
        self.archivos = archivos

    def load(self, account_id: str) -> list[Movement]:
        try:
            df = pd.read_csv(self.archivos[account_id])
        except FileNotFoundError:
            raise AccountDataNotFoundError(f"CSV de {account_id} no encontrado")
        except Exception as e:
            raise AccountDataReadError(f"Error leyendo datos: {e}")

        df["Fecha"] = pd.to_datetime(df["Fecha"])
        df["Total"] = pd.to_numeric(df["Total"], errors="coerce")
        df["Saldo"] = pd.to_numeric(df["Saldo"], errors="coerce")
        df = df.sort_values("Fecha", kind="mergesort").reset_index(drop=True)

        return [
            Movement(
                id=uuid.uuid4(),
                account_id=account_id,
                occurred_at=row["Fecha"],
                type=row["Tipo"],
                concept=row["Concepto"],
                amount=float(row["Total"]),
                balance=float(row["Saldo"]),
            )
            for row in df.to_dict(orient="records")
        ]

    def save(self, account_id: str, movements: list[Movement]) -> None:
        df = pd.DataFrame([{
            "Fecha": m.occurred_at,
            "Tipo": m.type,
            "Concepto": m.concept,
            "Total": m.amount,
            "Saldo": m.balance,
        } for m in movements])
        df["Fecha"] = df["Fecha"].dt.strftime("%Y-%m-%d %H:%M:%S.%f")
        ruta = self.archivos[account_id]
        with tempfile.NamedTemporaryFile("w", delete=False, dir=".", suffix=".tmp") as f:
            df.to_csv(f, index=False)
            tmp = f.name
        os.replace(tmp, ruta)
