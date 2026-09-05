import math
from datetime import datetime

import pandas as pd

from domain.exceptions import InvalidAmountError, InvalidDateError


def parse_total(data: dict) -> float:
    try:
        total = float(data["total"])
    except (KeyError, TypeError, ValueError):
        raise InvalidAmountError("Importe inválido")
    if math.isnan(total) or math.isinf(total) or total <= 0:
        raise InvalidAmountError("El importe debe ser mayor que cero")
    return total


def parse_fecha(data: dict):
    try:
        return pd.to_datetime(data["fecha"]) if data.get("fecha") else datetime.now()
    except Exception:
        raise InvalidDateError("Fecha inválida")
