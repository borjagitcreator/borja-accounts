"""
Bloque 1 del refactor (docs/ARCHITECTURE.md): mismo comportamiento que el
app.py (Flask) que reemplaza, solo cambia el framework HTTP. La lógica de
dominio (cargar/guardar/recalcular_saldo/validaciones) se extrae a
domain/application/infrastructure en el Bloque 2 — aquí todavía vive plana,
a propósito, para aislar el cambio de framework del cambio de arquitectura.

Rutas relativas ('openbank.csv'/'ibkr.csv') se resuelven contra el cwd del
proceso, igual que en el app.py original.
"""
import math
import os
import tempfile
from datetime import datetime

import pandas as pd
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI()

ARCHIVOS = {
    "openbank": "openbank.csv",
    "ibkr": "ibkr.csv",
}

TIPOS_POSITIVOS = {"Ingreso", "Saldo Inicial", "Nómina", "Inversión_r", "Devolución", "Apuestas_r"}

TIPOS_POR_CUENTA = {
    "openbank": ["Gasto", "Devolución", "Ingreso", "Nómina", "Apuestas", "Apuestas_r", "Transferencia"],
    "ibkr": ["Gasto", "Ingreso", "Inversión", "Inversión_r"],
}


def cargar(cuenta):
    try:
        df = pd.read_csv(ARCHIVOS[cuenta])
    except FileNotFoundError:
        return None, JSONResponse({"error": f"CSV de {cuenta} no encontrado"}, status_code=404)
    except Exception as e:
        return None, JSONResponse({"error": f"Error leyendo datos: {e}"}, status_code=500)
    df["Fecha"] = pd.to_datetime(df["Fecha"])
    df["Total"] = pd.to_numeric(df["Total"], errors="coerce")
    df["Saldo"] = pd.to_numeric(df["Saldo"], errors="coerce")
    return df.sort_values("Fecha", kind="mergesort").reset_index(drop=True), None


def recalcular_saldo(df):
    saldo = 0.0
    for i, row in df.iterrows():
        saldo += row["Total"] if row["Tipo"] in TIPOS_POSITIVOS else -row["Total"]
        df.at[i, "Saldo"] = round(saldo, 2)
    return df


def guardar(df, cuenta):
    df = df.copy()
    df["Fecha"] = df["Fecha"].dt.strftime("%Y-%m-%d %H:%M:%S.%f")
    ruta = ARCHIVOS[cuenta]
    with tempfile.NamedTemporaryFile("w", delete=False, dir=".", suffix=".tmp") as f:
        df.to_csv(f, index=False)
        tmp = f.name
    os.replace(tmp, ruta)


def _parse_total(data):
    try:
        total = float(data["total"])
    except (KeyError, TypeError, ValueError):
        return None, JSONResponse({"error": "Importe inválido"}, status_code=400)
    if math.isnan(total) or math.isinf(total) or total <= 0:
        return None, JSONResponse({"error": "El importe debe ser mayor que cero"}, status_code=400)
    return total, None


def _parse_fecha(data):
    try:
        return (pd.to_datetime(data["fecha"]) if data.get("fecha") else datetime.now()), None
    except Exception:
        return None, JSONResponse({"error": "Fecha inválida"}, status_code=400)


async def _read_json(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = None
    if not data:
        return None, JSONResponse({"error": "JSON inválido o Content-Type incorrecto"}, status_code=400)
    return data, None


def _validar_tipo_concepto(df, cuenta, tipo, concepto, exclude_idx=None):
    if tipo not in TIPOS_POR_CUENTA.get(cuenta, []):
        return JSONResponse({"error": f"Tipo '{tipo}' no válido para esta cuenta"}, status_code=400)
    if not concepto:
        return JSONResponse({"error": "El concepto no puede estar vacío"}, status_code=400)

    check = df if exclude_idx is None else df.drop(index=exclude_idx)

    if tipo == "Devolución":
        if check[(check["Tipo"] == "Gasto") & (check["Concepto"] == concepto)].empty:
            return JSONResponse({"error": f"No existe 'Gasto' con concepto '{concepto}'"}, status_code=400)
    elif tipo in ("Inversión_r", "Apuestas_r"):
        tipo_origen = "Inversión" if tipo == "Inversión_r" else "Apuestas"
        if check[(check["Tipo"] == tipo_origen) & (check["Concepto"] == concepto)].empty:
            return JSONResponse({"error": f"No existe '{tipo_origen}' con concepto '{concepto}'"}, status_code=400)
        if tipo == "Apuestas_r" and not check[(check["Tipo"] == "Apuestas_r") & (check["Concepto"] == concepto)].empty:
            return JSONResponse({"error": f"La apuesta '{concepto}' ya tiene retorno registrado"}, status_code=400)
    return None


@app.get("/")
def index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


@app.get("/api/patrimonio")
def get_patrimonio():
    result = {}
    for cuenta, archivo in ARCHIVOS.items():
        try:
            df = pd.read_csv(archivo)
            df = df.sort_values("Fecha", kind="mergesort")
            result[cuenta] = round(float(df.iloc[-1]["Saldo"]), 2) if not df.empty else 0.0
        except Exception:
            result[cuenta] = 0.0
    return result


@app.get("/api/data/{cuenta}")
def get_data(cuenta: str):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    df, err = cargar(cuenta)
    if err:
        return err
    records = df.to_dict(orient="records")
    for i, r in enumerate(records):
        r["_idx"] = i
        r["Fecha"] = r["Fecha"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(r["Fecha"], "strftime") else str(r["Fecha"])
    return records


@app.post("/api/movimiento/{cuenta}")
async def add_movimiento(cuenta: str, request: Request):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    data, err = await _read_json(request)
    if err:
        return err

    tipo = data.get("tipo", "")
    concepto = data.get("concepto", "").strip()

    total, err = _parse_total(data)
    if err:
        return err

    fecha, err = _parse_fecha(data)
    if err:
        return err

    df, err = cargar(cuenta)
    if err:
        return err

    err = _validar_tipo_concepto(df, cuenta, tipo, concepto)
    if err:
        return err

    nuevo = pd.DataFrame([{"Fecha": fecha, "Tipo": tipo, "Concepto": concepto, "Total": total, "Saldo": 0.0}])
    df = pd.concat([df, nuevo], ignore_index=True)
    df = df.sort_values("Fecha", kind="mergesort").reset_index(drop=True)
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return {"ok": True, "saldo": float(df.iloc[-1]["Saldo"])}


@app.put("/api/movimiento/{cuenta}")
async def edit_movimiento(cuenta: str, request: Request):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    data, err = await _read_json(request)
    if err:
        return err

    try:
        idx = int(data["idx"])
    except (KeyError, TypeError, ValueError):
        return JSONResponse({"error": "Índice de movimiento inválido"}, status_code=400)

    tipo = data.get("tipo", "")
    concepto = data.get("concepto", "").strip()

    total, err = _parse_total(data)
    if err:
        return err

    df, err = cargar(cuenta)
    if err:
        return err
    if idx < 0 or idx >= len(df):
        return JSONResponse({"error": "Movimiento no encontrado"}, status_code=404)

    if df.at[idx, "Tipo"] == "Saldo Inicial":
        return JSONResponse({"error": "No se puede editar el saldo inicial"}, status_code=400)

    err = _validar_tipo_concepto(df, cuenta, tipo, concepto, exclude_idx=idx)
    if err:
        return err

    df.at[idx, "Tipo"] = tipo
    df.at[idx, "Concepto"] = concepto
    df.at[idx, "Total"] = total
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return {"ok": True, "saldo": float(df.iloc[-1]["Saldo"])}


@app.delete("/api/movimiento/{cuenta}")
def delete_movimiento(cuenta: str):
    if cuenta not in ARCHIVOS:
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    df, err = cargar(cuenta)
    if err:
        return err
    if len(df) <= 1:
        return JSONResponse({"error": "No se puede borrar el saldo inicial"}, status_code=400)

    ultimo = df.iloc[-1]
    eliminado = {
        "fecha": str(ultimo["Fecha"]),
        "tipo": ultimo["Tipo"],
        "concepto": ultimo["Concepto"],
        "total": float(ultimo["Total"]),
    }

    df = df.iloc[:-1].copy().reset_index(drop=True)
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return {"ok": True, "eliminado": eliminado, "saldo": float(df.iloc[-1]["Saldo"])}


@app.post("/api/transferencia")
async def transferencia(request: Request):
    data, err = await _read_json(request)
    if err:
        return err

    origen = data.get("origen", "")
    destino = data.get("destino", "")

    if origen not in ARCHIVOS or destino not in ARCHIVOS or origen == destino:
        return JSONResponse({"error": "Cuentas inválidas"}, status_code=400)

    total, err = _parse_total(data)
    if err:
        return err

    fecha, err = _parse_fecha(data)
    if err:
        return err

    df_o, err = cargar(origen)
    if err:
        return err
    df_o = pd.concat([df_o, pd.DataFrame([{
        "Fecha": fecha, "Tipo": "Transferencia",
        "Concepto": f"A {destino.upper()}", "Total": total, "Saldo": 0.0,
    }])], ignore_index=True)
    df_o = df_o.sort_values("Fecha", kind="mergesort").reset_index(drop=True)
    df_o = recalcular_saldo(df_o)

    df_d, err = cargar(destino)
    if err:
        return err
    df_d = pd.concat([df_d, pd.DataFrame([{
        "Fecha": fecha, "Tipo": "Ingreso",
        "Concepto": f"Desde {origen.upper()}", "Total": total, "Saldo": 0.0,
    }])], ignore_index=True)
    df_d = df_d.sort_values("Fecha", kind="mergesort").reset_index(drop=True)
    df_d = recalcular_saldo(df_d)

    guardar(df_o, origen)
    guardar(df_d, destino)

    return {
        "ok": True,
        "saldo_origen": float(df_o.iloc[-1]["Saldo"]),
        "saldo_destino": float(df_d.iloc[-1]["Saldo"]),
    }
