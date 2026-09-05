"""
Bloque 3 del refactor (docs/ARCHITECTURE.md): SQLite reemplaza al CSV como
store activo. El dominio (Movement, Account, LedgerService) y los casos de
uso viven en domain/ y application/, sin cambios respecto al Bloque 2 --
solo cambia qué implementación del puerto MovementRepository se conecta
aquí. Este fichero sigue siendo solo routing FastAPI: parsea el request,
invoca el caso de uso correspondiente y traduce excepciones de dominio al
mismo contrato JSON que exponía el app.py (Flask) original.

Los CSV reales (openbank.csv/ibkr.csv) no se leen ni escriben más desde
aquí -- pasan a rol de import/export vía scripts/migrate_csv_to_sqlite.py.
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
from domain.value_objects import TIPOS_POR_CUENTA
from infrastructure.persistence.sqlite.repository import SQLiteMovementRepository

BASE_DIR = _REPO_ROOT
ARCHIVOS = set(TIPOS_POR_CUENTA)  # nombres de cuenta conocidos -- ya no rutas de fichero

# Sin default oculto dentro de SQLiteMovementRepository (exige db_path
# explícito) -- pero esta capa de configuración sí resuelve uno real, para
# que `run.sh`/producción funcionen sin variables de entorno adicionales.
# El harness pasa siempre su propia ruta temporal vía BORJA_ACCOUNTS_DB.
DB_PATH = os.environ.get("BORJA_ACCOUNTS_DB", os.path.join(BASE_DIR, "borja_accounts.db"))

app = FastAPI()

repository = SQLiteMovementRepository(DB_PATH)
ledger = LedgerService()


def _run(fn, *args, **kwargs):
    """Invoca un caso de uso y traduce sus excepciones al mismo contrato
    JSON que exponía app.py: {"error": ...} + status_code."""
    try:
        return fn(*args, **kwargs), None
    except DomainError as e:
        return None, JSONResponse({"error": str(e)}, status_code=e.status_code)


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
