from enum import Enum


class AccountKind(str, Enum):
    CASH = "CASH"
    INVESTMENT = "INVESTMENT"


# Tipos de movimiento válidos por cuenta. Vive en el dominio porque es una
# regla de negocio (qué tipos tiene sentido registrar en cada clase de
# cuenta), no un detalle de presentación — hoy sigue duplicado en index.html
# (TIPOS_POR_CUENTA), eso se resuelve cuando el frontend deje de mantener su
# propia copia (Bloque 4/5).
TIPOS_POR_CUENTA = {
    "openbank": ["Gasto", "Devolución", "Ingreso", "Nómina", "Apuestas", "Apuestas_r", "Transferencia"],
    "ibkr": ["Gasto", "Ingreso", "Inversión", "Inversión_r"],
}

TIPOS_POSITIVOS = {"Ingreso", "Saldo Inicial", "Nómina", "Inversión_r", "Devolución", "Apuestas_r"}

# Igual a TIPOS_INGRESO/TIPOS_NEGATIVOS en index.html: TIPOS_POSITIVOS es
# idéntico a TIPOS_INGRESO; TIPOS_NEGATIVOS es un conjunto explícito, no el
# complemento genérico de TIPOS_POSITIVOS.
TIPOS_NEGATIVOS = {"Gasto", "Apuestas", "Inversión", "Transferencia"}
