# Golden master

Congela el comportamiento actual de `app.py` (Flask) e `index.html` (SPA vanilla)
para que el refactor descrito en `docs/ARCHITECTURE.md` se pueda validar bloque
a bloque sin arriesgar los datos reales (`openbank.csv`/`ibkr.csv`, en `.gitignore`).

## Piezas

- **`build_fixture.py`** — genera `openbank.example.csv`/`ibkr.example.csv` (versionados) a partir de un dataset sintético declarado en el propio script. Cubre: gastos recurrentes en 4+ conceptos a través de 7 meses, nómina, ingreso puntual, devolución sobre un gasto existente, una apuesta abierta y dos cerradas (una ganadora, una perdedora con pérdida total), una inversión abierta y dos cerradas (una ganadora, una perdedora), una transferencia Openbank→IBKR con su ingreso emparejado, y dos movimientos con timestamp idéntico (valida la estabilidad del `mergesort`). Reutiliza `recalcular_saldo()` de `app.py` para que el `Saldo` del fixture sea consistente con el comportamiento real, no aritmética manual.
- **`scenario.py`** — `run_scenario()`: ejecuta una secuencia determinista contra el `app.py` real (vía `Flask.test_client()`, nunca un servidor HTTP real) sobre una **copia** del fixture en un directorio temporal. Nunca toca `openbank.csv`/`ibkr.csv` reales.
- **`generate_snapshot.py`** — congela `snapshot_backend.json` a partir de `run_scenario()`. Solo se ejecuta a mano cuando un cambio de comportamiento es intencional.
- **`run_frontend_harness.mjs`** — ejecuta el `<script>` inline de `index.html` **verbatim** (extraído por regex, nunca transcrito a mano) dentro de un `vm` context de Node con stubs mínimos de `document`/`Plotly`/`fetch` y el reloj fijado a `Date` = `2026-07-15T12:00:00.000Z`, `TZ=Europe/Madrid`. Toma como fixture los mismos datos que ya devolvió el backend (`snapshot_backend.json`), para no mantener el dataset dos veces. Salida: `snapshot_frontend.json`.
- **`test_golden_master.py`** — pytest que regenera ambos snapshots en memoria y los compara contra los ficheros congelados.

## Por qué el TZ está fijado a `Europe/Madrid` y no a `UTC`

Es la zona horaria real del usuario, y varios cálculos de calendario (`calendarMonthStart`, los filtros `1m`/`3m`/`6m`/`año`) dependen de los componentes de fecha *locales* — fijar `UTC` haría que el golden master validara un comportamiento que nadie experimenta en el navegador real.

**Bug histórico, ya corregido** (ver el commit que corrige `domain/services/kpi.py`, `monthKey()` y `periodSlices()`): `monthKey()` y la rama `kpiType === 'mes'` de `periodSlices` calculaban el "mes anterior" con `new Date(y, m, 1).toISOString().slice(0, 7)`. En un TZ de offset positivo como `Europe/Madrid`, esa conversión a UTC cruza medianoche hacia atrás y resolvía al mes anterior al que realmente correspondía — de forma muy visible en `topMerchantsHtml()` ("Top del mes"), que llegó a mostrar los conceptos del mes **anterior** bajo la etiqueta "este mes". El equivalente en el backend (`domain/services/kpi.py`, ya migrado en el Bloque 4) tenía el mismo bug y se corrigió a la vez. El fix: no pasar por UTC para decidir a qué mes de calendario pertenece una fecha — usar siempre los componentes locales del instante, igual que ya hacía correctamente `calendarMonthStart()`.

Los snapshots (`snapshot_backend.json`, `snapshot_frontend.json`) capturan el comportamiento **ya corregido**. Cualquier futuro cambio de comportamiento intencional sigue el mismo protocolo: se regeneran a mano y el commit documenta los números antes/después.

## Regenerar (solo tras un cambio de comportamiento intencional y revisado)

```bash
python tests/golden_master/generate_snapshot.py
node tests/golden_master/run_frontend_harness.mjs > tests/golden_master/snapshot_frontend.json
```

## Ejecutar

```bash
pytest tests/golden_master -v
```
