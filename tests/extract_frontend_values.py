"""
Extrae de snapshot_frontend.json (generado con el vanilla JS de los Bloques
0-4, ver run_frontend_harness.mjs) los VALORES DE TEXTO VISIBLES -- montos,
porcentajes, conteos, etiquetas -- que el Bloque 5 (React) debe seguir
mostrando. No se compara HTML string a string: la tecnología de renderizado
cambia de interpolación de template literals a componentes con DOM real, y
un componente React nunca produce el mismo string byte a byte (orden de
atributos, self-closing, whitespace) aunque el contenido semántico sea
idéntico. Lo que hay que proteger es el conjunto de textos visibles, no el
marcado.

Se genera UNA SOLA VEZ, antes de escribir ningún componente React, mientras
snapshot_frontend.json todavía refleja el comportamiento vanilla ya
verificado contra snapshot_backend.json (Bloque 4). El fichero de salida,
snapshot_frontend_values.json, se congela igual que cualquier otro
snapshot del golden master: no se regenera para que un test en rojo se
calle solo, solo ante un cambio de comportamiento deliberado.

Uso: python3 extract_frontend_values.py > snapshot_frontend_values.json
     (o simplemente ejecutar el módulo: escribe el fichero directamente)

Exclusiones deliberadas (limpieza de UI acordada, docs/ARCHITECTURE.md §0):
- openbank_top_merchants: sección completa "Top del mes" (chips), eliminada
  del UI en el Bloque 5.
- Columnas "Bal. Hist." / "Crec. Hist." (apuestas) y "Bal. Hist." /
  "ROI Hist." (carteras): las 2 últimas columnas de cada tabla "histórico
  cerrado", eliminadas del UI en el Bloque 5. Se identifican y recortan
  estructuralmente (no por regenerar el snapshot), ver strip_historical_columns.
- openbank_charts_all / ibkr_charts_all: las funciones chart* pasan los
  datos de snapshot_backend.json a Plotly casi sin transformación (la
  media móvil vive ahora en el backend). El test de React para gráficos
  compara las traces capturadas directamente contra snapshot_backend.json,
  no contra este fichero -- no tiene sentido extraer "texto visible" de
  coordenadas de un gráfico.
"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).parent
SNAPSHOT_PATH = HERE / "snapshot_frontend.json"
OUTPUT_PATH = HERE / "snapshot_frontend_values.json"

EXCLUDED_KEYS = {"openbank_top_merchants", "openbank_charts_all", "ibkr_charts_all"}
EXCLUDED_REASON = {
    "openbank_top_merchants": "Sección 'Top del mes' (chips) eliminada del UI en el Bloque 5 -- ver docs/ARCHITECTURE.md §0.",
    "openbank_charts_all": "Datos de Plotly sin transformación real desde snapshot_backend.json -- se verifican contra ese fichero, no aquí.",
    "ibkr_charts_all": "Idem.",
}

HIST_TABLE_MARKER = "Bal. Hist."
HIST_COLS_TO_DROP = 2  # Bal. Hist. + (Crec. Hist. | ROI Hist.)
EXCLUDED_COLUMNS_REASON = {
    "openbank_apuestas_body": "Columnas 'Bal. Hist.' / 'Crec. Hist.' eliminadas del UI en el Bloque 5 -- ver docs/ARCHITECTURE.md §0.",
    "ibkr_inversiones_body": "Columnas 'Bal. Hist.' / 'ROI Hist.' eliminadas del UI en el Bloque 5 -- ídem.",
}

_CELL_OPEN = r"<t[hd](?:\s[^>]*)?>"
_CELL_CLOSE = r"</t[hd]>"
_CELL_RE = re.compile(_CELL_OPEN + r".*?" + _CELL_CLOSE, re.S)
_ROW_RE = re.compile(r"<tr[^>]*>.*?</tr>", re.S)
_TABLE_RE = re.compile(r"<table>.*?</table>", re.S)
_ROW_OPEN_RE = re.compile(r"(<tr[^>]*>)")


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chunks = []

    def handle_data(self, data):
        text = data.strip()
        if text:
            self.chunks.append(text)


def extract_text(html_fragment: str) -> list:
    parser = _TextExtractor()
    parser.feed(html_fragment)
    return parser.chunks


def _drop_last_cells(row_html: str, n: int) -> str:
    cells = _CELL_RE.findall(row_html)
    kept = cells[:-n] if n else cells
    open_tag = _ROW_OPEN_RE.match(row_html).group(1)
    return open_tag + "".join(kept) + "</tr>"


def strip_historical_columns(html_fragment: str) -> str:
    """Recorta, fila a fila (header incluido), las últimas HIST_COLS_TO_DROP
    celdas de cualquier tabla que contenga HIST_TABLE_MARKER en su thead."""
    def process_table(match):
        table_html = match.group(0)
        if HIST_TABLE_MARKER not in table_html:
            return table_html
        return _ROW_RE.sub(lambda m: _drop_last_cells(m.group(0), HIST_COLS_TO_DROP), table_html)

    if HIST_TABLE_MARKER not in html_fragment:
        return html_fragment
    return _TABLE_RE.sub(process_table, html_fragment)


def _extract(value):
    if isinstance(value, str):
        return extract_text(strip_historical_columns(value))
    if isinstance(value, dict):
        return {k: _extract(v) for k, v in value.items()}
    raise TypeError(f"Tipo no soportado: {type(value)!r}")


def main():
    snapshot = json.loads(SNAPSHOT_PATH.read_text())
    values = {}
    excluded = []
    for key, value in snapshot.items():
        if key in EXCLUDED_KEYS:
            excluded.append(key)
            continue
        values[key] = _extract(value)

    output = {
        "_meta": {
            "source": "snapshot_frontend.json",
            "excluded_keys": {k: EXCLUDED_REASON[k] for k in excluded},
            "excluded_columns": EXCLUDED_COLUMNS_REASON,
        },
        "values": values,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Escrito {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
