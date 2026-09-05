"""Traducción de la parte de cálculo de chartCarteras (index.html, cuenta IBKR)."""
from datetime import datetime

from domain.entities import Movement
from domain.services.concept_ranking import rank_by_concept


def compute_carteras_ranking(movements: list[Movement], range_type: str, year: int | None,
                              reference: datetime, mode: str = "media", limit: int = 12) -> dict:
    entries, hover_suffix, _has_items = rank_by_concept(
        movements, "Inversión", range_type, year, reference, mode, limit,
    )
    return {
        "entries": [{"concepto": c, "valor": v} for c, v in entries],
        "hoverSuffix": hover_suffix,
    }
