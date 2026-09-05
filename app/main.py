"""
Bloque 2 del refactor (docs/ARCHITECTURE.md): el dominio (Movement, Account,
LedgerService) y los casos de uso de escritura viven fuera de este módulo,
en domain/ y application/. Este fichero es ahora solo routing FastAPI —
parsea el request, invoca el caso de uso correspondiente y traduce
excepciones de dominio/infraestructura al mismo contrato JSON que exponía
el app.py (Flask) original: mismos endpoints, mismos mensajes de error,
mismo formato de fecha, mismo `_idx`/`idx` posicional (ver
infrastructure/persistence/csv/repository.py sobre por qué la identidad
real de un movimiento sigue siendo interna en este bloque).
"""
import os
import sys

# Garantiza que domain/application/infrastructure (paquetes hermanos de
# app/, en la raíz del repo) sean importables sin importar cómo se cargue
# este módulo (uvicorn, importlib directo desde el harness, etc.).
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse

from application.use_cases.add_movement import AddMovementUseCase
from application.use_cases.delete_movement import DeleteMovementUseCase
from application.use_cases.edit_movement import EditMovementUseCase
from application.use_cases.transfer_between_accounts import TransferBetweenAccountsUseCase
from domain.exceptions import DomainError
from domain.services.ledger import LedgerService
from infrastructure.persistence.csv.repository import (
    ARCHIVOS,
    AccountDataNotFoundError,
    AccountDataReadError,
    CSVMovementRepository,
)

BASE_DIR = _REPO_ROOT

app = FastAPI()

repository = CSVMovementRepository(ARCHIVOS)
ledger = LedgerService()


def _run(fn, *args, **kwargs):
    """Invoca un caso de uso y traduce sus excepciones al mismo contrato
    JSON que exponía app.py: {"error": ...} + status_code."""
    try:
        return fn(*args, **kwargs), None
    except DomainError as e:
        return None, JSONResponse({"error": str(e)}, status_code=e.status_code)
    except AccountDataNotFoundError as e:
        return None, JSONResponse({"error": str(e)}, status_code=404)
    except AccountDataReadError as e:
        return None, JSONResponse({"error": str(e)}, status_code=500)


async def _read_json(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = None
    if not data:
        return None, JSONResponse({"error": "JSON inválido o Content-Type incorrecto"}, status_code=400)
    return data, None


@app.get("/")
def index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


@app.get("/api/patrimonio")
def get_patrimonio():
    result = {}
    for cuenta in ARCHIVOS:
        try:
            movements = repository.load(cuenta)
            result[cuenta] = round(float(movements[-1].balance), 2) if movements else 0.0
        except Exception:
            result[cuenta] = 0.0
    return result


@app.get("/api/data/{cuenta}")
def get_data(cuenta: str):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    movements, err = _run(repository.load, cuenta)
    if err:
        return err
    return [
        {
            "Fecha": m.occurred_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(m.occurred_at, "strftime") else str(m.occurred_at),
            "Tipo": m.type,
            "Concepto": m.concept,
            "Total": m.amount,
            "Saldo": m.balance,
            "_idx": i,
        }
        for i, m in enumerate(movements)
    ]


@app.post("/api/movimiento/{cuenta}")
async def add_movimiento(cuenta: str, request: Request):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    data, err = await _read_json(request)
    if err:
        return err
    saldo, err = _run(AddMovementUseCase(repository, ledger).execute, cuenta, data)
    if err:
        return err
    return {"ok": True, "saldo": saldo}


@app.put("/api/movimiento/{cuenta}")
async def edit_movimiento(cuenta: str, request: Request):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    data, err = await _read_json(request)
    if err:
        return err
    saldo, err = _run(EditMovementUseCase(repository, ledger).execute, cuenta, data)
    if err:
        return err
    return {"ok": True, "saldo": saldo}


@app.delete("/api/movimiento/{cuenta}")
def delete_movimiento(cuenta: str):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    result, err = _run(DeleteMovementUseCase(repository, ledger).execute, cuenta)
    if err:
        return err
    eliminado, saldo = result
    return {"ok": True, "eliminado": eliminado, "saldo": saldo}


@app.post("/api/transferencia")
async def transferencia(request: Request):
    data, err = await _read_json(request)
    if err:
        return err
    result, err = _run(TransferBetweenAccountsUseCase(repository, ledger, ARCHIVOS).execute, data)
    if err:
        return err
    saldo_origen, saldo_destino = result
    return {"ok": True, "saldo_origen": saldo_origen, "saldo_destino": saldo_destino}
