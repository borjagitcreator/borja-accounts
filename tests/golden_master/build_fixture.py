"""
Genera openbank.example.csv / ibkr.example.csv con un dataset sintético
que ejercita todo el dominio (gastos recurrentes, nómina, devolución,
apuestas abiertas/cerradas ganadora y perdedora, inversiones abiertas/
cerradas ganadora y perdedora, transferencia entre cuentas, y dos filas
con timestamp idéntico para validar la estabilidad del mergesort).

"Hoy simulado" de referencia para el golden master: 2026-07-15.
Reutiliza recalcular_saldo() de app.py para que el Saldo del fixture sea
consistente con el comportamiento real del sistema, no aritmética manual.

Uso: python tests/golden_master/build_fixture.py
"""
import sys
import os
import importlib.util

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, REPO_ROOT)

spec = importlib.util.spec_from_file_location("app", os.path.join(REPO_ROOT, "app.py"))
appmod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(appmod)

import pandas as pd

OPENBANK_SEED = [
    ("2026-01-01 09:00:00", "Saldo Inicial", "Apertura de cuenta", 5000.00),
    ("2026-01-05 10:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-01-06 11:00:00", "Gasto", "Supermercado", 220.00),
    ("2026-01-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-01-15 09:00:00", "Nómina", "Sueldo enero", 1800.00),
    ("2026-01-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-01-25 18:30:00", "Apuestas", "B365 - 1", 100.00),
    ("2026-02-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-02-06 11:00:00", "Gasto", "Supermercado", 240.00),
    ("2026-02-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-02-10 09:00:00", "Gasto", "Reparación bici", 85.00),
    ("2026-02-15 09:00:00", "Nómina", "Sueldo febrero", 1800.00),
    ("2026-02-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-02-22 12:00:00", "Apuestas", "B365 - 2", 80.00),
    ("2026-03-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-03-06 11:00:00", "Gasto", "Supermercado", 260.00),
    ("2026-03-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-03-12 09:00:00", "Devolución", "Reparación bici", 85.00),
    ("2026-03-15 09:00:00", "Nómina", "Sueldo marzo", 1800.00),
    ("2026-03-18 20:00:00", "Apuestas_r", "B365 - 1", 150.00),
    ("2026-03-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-03-25 09:00:00", "Ingreso", "Reembolso trabajo", 150.00),
    ("2026-04-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-04-06 11:00:00", "Gasto", "Supermercado", 230.00),
    ("2026-04-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-04-10 15:00:00", "Apuestas_r", "B365 - 2", 0.00),
    ("2026-04-15 09:00:00", "Nómina", "Sueldo abril", 1800.00),
    ("2026-04-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-05-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-05-06 11:00:00", "Gasto", "Supermercado", 210.00),
    ("2026-05-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-05-15 09:00:00", "Nómina", "Sueldo mayo", 1800.00),
    ("2026-05-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-05-28 09:00:00", "Apuestas", "B365 - 3", 120.00),
    ("2026-06-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-06-06 11:00:00", "Gasto", "Supermercado", 250.00),
    ("2026-06-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-06-15 09:00:00", "Nómina", "Sueldo junio", 1800.00),
    ("2026-06-20 09:00:00", "Gasto", "Gimnasio", 40.00),
    ("2026-06-25 10:00:00", "Transferencia", "A IBKR", 400.00),
    ("2026-07-01 09:00:00", "Gasto", "Alquiler", 900.00),
    ("2026-07-05 11:00:00", "Gasto", "Supermercado", 130.00),
    ("2026-07-05 11:00:00", "Gasto", "Restaurante", 45.00),
    ("2026-07-08 09:00:00", "Gasto", "Transporte", 60.00),
    ("2026-07-15 09:00:00", "Nómina", "Sueldo julio", 1800.00),
]

IBKR_SEED = [
    ("2026-01-01 09:00:00", "Saldo Inicial", "Apertura de cuenta", 1000.00),
    ("2026-01-10 09:00:00", "Inversión", "Cartera Tech", 300.00),
    ("2026-02-05 09:00:00", "Inversión", "Cartera Bonos", 200.00),
    ("2026-03-01 09:00:00", "Gasto", "Comisión custodia", 10.00),
    ("2026-04-12 09:00:00", "Inversión", "Cartera Global", 250.00),
    ("2026-05-10 09:00:00", "Inversión_r", "Cartera Tech", 400.00),
    ("2026-06-08 09:00:00", "Inversión_r", "Cartera Bonos", 150.00),
    ("2026-06-25 10:30:00", "Ingreso", "Desde OPENBANK", 400.00),
    ("2026-07-02 09:00:00", "Ingreso", "Dividendo", 15.00),
]


def build(seed, cuenta, out_path):
    df = pd.DataFrame(seed, columns=["Fecha", "Tipo", "Concepto", "Total"])
    df["Fecha"] = pd.to_datetime(df["Fecha"])
    df["Saldo"] = 0.0
    # Preserva el orden de inserción del seed (mergesort es estable frente a él).
    df = appmod.recalcular_saldo(df)
    df["Fecha"] = df["Fecha"].dt.strftime("%Y-%m-%d %H:%M:%S.%f")
    df.to_csv(out_path, index=False)
    print(f"{cuenta}: {len(df)} filas -> {out_path} (saldo final {df.iloc[-1]['Saldo']})")


if __name__ == "__main__":
    build(OPENBANK_SEED, "openbank", os.path.join(REPO_ROOT, "openbank.example.csv"))
    build(IBKR_SEED, "ibkr", os.path.join(REPO_ROOT, "ibkr.example.csv"))
