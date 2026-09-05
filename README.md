# Cuentas — Panel de control financiero personal

Interfaz web local para llevar el seguimiento de dos cuentas (Openbank e IBKR). Permite añadir movimientos, visualizar estadísticas y analizar apuestas/inversiones, con los datos guardados en CSV.

---

## Estructura de archivos

```
Cuentas/
├── app.py              ← Backend Flask (servidor y API)
├── index.html          ← Frontend completo (UI, gráficos, tablas)
├── pyproject.toml      ← Dependencias Python (gestionadas con uv)
├── uv.lock             ← Lockfile de dependencias
├── run.sh              ← Arranque (uv run + lanza app.py)
├── openbank.csv        ← Datos de Openbank
├── ibkr.csv            ← Datos de IBKR
├── tests/golden_master/← Harness de regresión para el refactor (ver docs/ARCHITECTURE.md)
└── README.md
```

---

## Puesta en marcha

Requiere [uv](https://docs.astral.sh/uv/) instalado (`brew install uv` o ver su web).

```bash
uv sync

# Los CSV con datos reales (openbank.csv, ibkr.csv) están en .gitignore.
# En un clon nuevo, arranca a partir de los ejemplos:
cp openbank.example.csv openbank.csv
cp ibkr.example.csv ibkr.csv

./run.sh
```

Abre automáticamente **Chrome** en **http://localhost:5000** (también puedes abrirlo a mano). Se fuerza Chrome porque en Firefox sobre Wayland/COSMIC los popups nativos de `<select>` e `<input type="date">` pueden no desplegarse (bug del compositor, no de la app).

El servidor arranca con `FLASK_DEBUG` opcional y `use_reloader=False`, para que el puerto se libere limpiamente con Ctrl+C.

---

## Formato de los CSV

Ambos CSV tienen las mismas cinco columnas:

| Columna  | Tipo     | Descripción                               |
|----------|----------|-------------------------------------------|
| Fecha    | datetime | Fecha y hora del movimiento               |
| Tipo     | string   | Categoría del movimiento (ver tabla)      |
| Concepto | string   | Descripción libre                         |
| Total    | float    | Importe en euros (siempre positivo)       |
| Saldo    | float    | Saldo acumulado calculado automáticamente |

---

## Tipos de movimiento

### Openbank

| Tipo interno  | Nombre en UI      | Efecto sobre saldo | Descripción                                |
|---------------|-------------------|--------------------|--------------------------------------------|
| Gasto         | Gasto             | Resta              | Cualquier gasto                            |
| Ingreso       | Ingreso           | Suma               | Entrada puntual de dinero                  |
| Nómina        | Nómina            | Suma               | Ingreso periódico (clases, sueldo...)      |
| Devolución    | Devolución        | Suma               | Reembolso de un gasto previo               |
| Apuestas      | Apuestas          | Resta              | Banca enviada a una ronda de apuestas      |
| Apuestas_r    | Cobro apuesta     | Suma               | Retorno recibido de una ronda de apuestas  |
| Transferencia | Transferencia     | Resta              | Dinero enviado a otra cuenta               |

### IBKR

| Tipo interno | Nombre en UI  | Efecto sobre saldo | Descripción                               |
|--------------|---------------|--------------------|-------------------------------------------|
| Gasto        | Gasto         | Resta              | Comisiones u otros gastos                 |
| Ingreso      | Ingreso       | Suma               | Entradas de dinero                        |
| Inversión    | Inversión     | Resta              | Dinero enviado a una cartera              |
| Inversión_r  | Retorno inv.  | Suma               | Retorno recibido al cerrar una cartera    |

> El nombre en UI es solo visual. El valor que se guarda en el CSV y se valida en el backend siempre es el tipo interno.

---

## Lógica de saldo

El saldo se recalcula siempre desde cero (barrido completo) cada vez que se añade o borra un movimiento. Los registros se ordenan por fecha antes del cálculo (`mergesort` estable: si dos movimientos tienen la misma fecha exacta, se respeta el orden de inserción).

**Tipos que suman:** `Ingreso`, `Saldo Inicial`, `Nómina`, `Inversión_r`, `Devolución`, `Apuestas_r`

**Tipos que restan:** todos los demás (`Gasto`, `Apuestas`, `Inversión`, `Transferencia`)

---

## Funcionalidades de la interfaz

### Header
Muestra el patrimonio total (Openbank + IBKR) y el desglose por cuenta. Contiene el botón de transferencia entre cuentas.

### Selector de cuenta (tabs)
Cambia entre la vista de Openbank y la de IBKR. Cada cuenta mantiene de forma independiente su propio estado de filtros: cambiar de pestaña no resetea ni contamina los filtros de la otra.

---

### Vista Openbank

#### KPIs
Cuatro tarjetas con un selector de período en la esquina superior derecha (**Mes** / **Trimestre** / **Año**):
- **Saldo actual** — último saldo del CSV (siempre el balance real, sin filtrar)
- **Ingresos** — suma exclusivamente de `Nómina` en el período seleccionado
- **Gastos** — suma exclusivamente de `Gasto` en el período seleccionado
- **Balance** — (todos los que suman: `Ingreso`, `Nómina`, `Devolución`, `Apuestas_r`, `Inversión_r`) − (todos los que restan: `Gasto`, `Apuestas`, `Inversión`, `Transferencia`)

Cada KPI de ingresos/gastos/balance muestra un delta `↑ +X€ vs ant.` comparando con el período equivalente anterior (mes anterior, trimestre anterior, año anterior). Para gastos la lógica se invierte: bajar es positivo. Cambiar el período solo actualiza las tarjetas, sin reconstruir la página.

#### Filtros por panel

Cada panel de datos tiene sus propios botones de filtro temporal integrados en su cabecera. Los filtros son independientes entre paneles.

**El filtro por defecto de todos los paneles es `3 meses`.** El panel de gastos arranca además en modo **Media/mes**.

Los rangos son **meses de calendario** (no ventanas rodantes de 30/90/180 días). Ejemplo en junio:
- `Mes` — solo junio (desde el día 1)
- `3 meses` — abril + mayo + junio
- `6 meses` — enero … junio

Opciones disponibles (se ocultan si no hay datos en ese rango):
- `Todo` — todos los registros del historial
- `6 meses` / `3 meses` / `Mes`
- Un botón por cada año con datos registrados

Los paneles con filtro temporal propio son: **Evolución del saldo**, **Evolución mensual**, **Gastos por concepto**, **Análisis de Apuestas** (y en IBKR: **Capital por cartera**, **Transferencias**, **Análisis de carteras**). La tabla de movimientos no usa filtro temporal: tiene su propio buscador.

> Cambiar un filtro de panel actualiza solo ese panel — el formulario de añadir movimientos nunca se reconstruye.

El selector de KPIs **Trimestre** también usa los últimos 3 meses de calendario (no un trimestre fiscal fijo).

#### Gráfico: Evolución del saldo
- Línea de saldo a lo largo del tiempo
- En Openbank: línea discontinua de media móvil 30 días (en IBKR no se muestra)
- Filtro temporal de panel

#### Gráfico: Evolución mensual
Barras verdes (ingresos) y rojas (gastos) por mes, con línea de balance neto. Respeta el filtro temporal del panel.

#### Gráfico: Gastos por concepto
Dos gráficos en paralelo que comparten el mismo filtro temporal:

**Ranking** — barras horizontales con los 20 conceptos `Gasto` mayores. Modos **Media/mes** (`Mes`→÷1, `3 meses`→÷3, `6 meses`→÷6) y **Total**.

**Donut** — peso porcentual de los conceptos (siempre total, no media).

Debajo: **Top del mes** — chips con los conceptos de gasto del mes calendario actual (clic → filtra la tabla de movimientos).

Si el gasto del mes va por encima (o por debajo) de la media de los 3 meses anteriores con datos, aparece un aviso suave bajo los KPIs.

#### Análisis de Apuestas

Sección con KPIs de resumen y dos subsecciones: posiciones abiertas e historial cerrado.

**Strip de KPIs (lifetime, no afectado por el filtro de período):**
- **Total apostado** — suma de todas las entradas `Apuestas` históricas
- **P&L neto** — balance acumulado de todas las apuestas cerradas
- **Win rate** — porcentaje de apuestas cerradas con balance positivo
- **En juego ahora** — posiciones abiertas actuales (concepto con `Apuestas` pero sin `Cobro apuesta`)

> Los KPIs son siempre históricos completos. El filtro de período solo controla qué filas aparecen en la tabla de historial.

**Posiciones abiertas** — tabla con las rondas que todavía no tienen cobro. Botón **Cerrar** en cada fila: abre un modal pre-rellenado con el concepto y la banca, donde se introduce el importe recibido y la fecha de cierre. Al confirmar se crea automáticamente el `Cobro apuesta` (`Apuestas_r`) correspondiente sin necesidad de añadirlo manualmente. Si la pérdida es total, se puede introducir 0 €.

**Historial cerrado** — tabla filtrada por fecha de cierre (`fr`) según el filtro de período activo:

| Columna     | Descripción                                            |
|-------------|--------------------------------------------------------|
| Concepto    | Nombre de la ronda (ej: "B365 - 12")                   |
| Inicio      | Fecha del primer `Apuestas` de esa ronda               |
| Cierre      | Fecha del último `Cobro apuesta` de esa ronda          |
| Banca       | Total apostado en esa ronda                            |
| Devuelto    | Total retornado en esa ronda                           |
| Balance     | Devuelto − Banca                                       |
| Crec.       | Crecimiento porcentual de la banca en esa ronda        |
| Bal. Hist.  | Balance acumulado hasta esa ronda (cumsum histórico)   |
| Crec. Hist. | Crecimiento histórico acumulado respecto a banca total |

#### Tabla de movimientos y buscador
La tabla muestra **los últimos 20 movimientos** por defecto. Cada fila (salvo `Saldo Inicial`) tiene **Duplicar** (rellena el formulario con fecha de hoy) y **Editar** (modal: tipo, concepto y total; la fecha no se cambia).

Encima hay un **buscador** (tipo / concepto / fecha) contra toda la cuenta. Con búsqueda activa se muestran hasta 500 resultados; **Limpiar** vuelve a los últimos 20.

Clic en un concepto de la tabla (o en un chip del top del mes) filtra por ese concepto. **Repetir último** rellena el formulario con el último movimiento cronológico.

#### Formulario: Añadir movimiento
A la derecha de la tabla. Autocompletado de concepto por frecuencia (prefijo, case-insensitive).
**Validaciones del servidor:**
- `Devolución`: el concepto debe coincidir con un `Gasto` registrado.
- `Cobro apuesta` (`Apuestas_r`): debe existir un `Apuestas` con el mismo concepto y no debe haber ya un `Cobro apuesta` con ese concepto (cada apuesta solo se puede cerrar una vez).
- `Retorno inv.` (`Inversión_r`): debe existir una `Inversión` con el mismo concepto.

**Autocompletado del concepto:**
- `Cobro apuesta` → apuestas abiertas (con `Apuestas` pero sin `Cobro apuesta` del mismo concepto)
- `Devolución` → conceptos de gastos registrados

#### Botón: Borrar último movimiento
Muestra un diálogo de confirmación con los detalles del último registro cronológico y, si se confirma, lo elimina y recalcula el saldo. No se puede borrar el `Saldo Inicial`.

---

### Vista IBKR

Vista de **cartera de inversión** (no cuenta corriente), con identidad visual propia (acento verde, monograma IK):

- **KPIs:** Saldo · Aportado neto (transferencias OB↔IBKR en el período) · En carteras (snapshot) · P&L cerrado (período)
- **Evolución del saldo** — sin media móvil
- **Capital por cartera** — ranking de conceptos `Inversión` (Media/mes o Total)
- **Transferencias** — recibido / enviado / neto con Openbank + lista + atajo ⇄
- **Análisis de carteras** — abiertas (ordenadas por capital), cerrar, historial
- **Movimientos + añadir** — misma potencia que Openbank (buscar, editar, duplicar, repetir)

#### Análisis de carteras

Strip de KPIs lifetime + carteras abiertas con **Cerrar** + historial filtrado por fecha de cierre.

Al cerrar una cartera, el toast muestra el **ROI** de ese cierre.

---

### Cerrar apuesta / cartera (modal)

El botón **Cerrar** abre un modal con concepto y banca/capital (solo lectura), importe recibido (0 € = pérdida total) y fecha. Crea `Apuestas_r` o `Inversión_r` automáticamente.

---

### Transferencia entre cuentas
El botón "⇄ Transferencia" en el header abre un modal con origen, destino, importe y fecha. Al confirmar, registra automáticamente:
- `Transferencia` (resta) en la cuenta origen con concepto "A IBKR" / "A OPENBANK"
- `Ingreso` (suma) en la cuenta destino con concepto "Desde OPENBANK" / "Desde IBKR"

---

## API del backend

| Método | Ruta                             | Descripción                                     |
|--------|----------------------------------|-------------------------------------------------|
| GET    | `/`                              | Sirve index.html                                |
| GET    | `/api/patrimonio`                | Saldo actual de ambas cuentas                   |
| GET    | `/api/data/<cuenta>`             | Movimientos JSON (incluye `_idx` por fila)      |
| POST   | `/api/movimiento/<cuenta>`       | Añade un movimiento y recalcula el saldo        |
| PUT    | `/api/movimiento/<cuenta>`       | Edita tipo/concepto/total (fecha intacta)       |
| DELETE | `/api/movimiento/<cuenta>`       | Borra el último movimiento y recalcula el saldo |
| POST   | `/api/transferencia`             | Registra una transferencia en ambas cuentas     |

---

## Notas de arquitectura

- **Filtros por panel, no por página.** Rangos `Mes` / `3 meses` / `6 meses` = meses de calendario. Cada panel y el buscador tienen estado independiente.
- **KPIs de apuestas/carteras son lifetime.** El filtro de período solo controla el historial cerrado (por fecha de cierre `fr`).
- **Identidad por cuenta.** Clases `acc-openbank` / `acc-ibkr` en `body` cambian acento y fondo; monogramas SVG inline (C / OB / IK).
- **Controles del formulario "Añadir movimiento".** El bloque NO es un `<form>` y sus campos NO llevan `required`.
- **`color-scheme: light`** en `:root`.
- **`run.sh` abre Chrome explícitamente** (con fallback a `xdg-open`), no el navegador por defecto: en Firefox sobre Wayland/COSMIC los popups nativos de `<select>` e `<input type="date">` fallan a nivel de compositor.
- **Layout de objetos Plotly.** `baseLayout()` devuelve un objeto fresco en cada llamada.
- **Saldo chart (IBKR):** sin media móvil. **Openbank:** media 30d.
- **Fechas en CSV** en `%Y-%m-%d %H:%M:%S.%f` para ordenamiento estable con `mergesort`.
- **Plotly.js** desde CDN.
- Flask solo en `localhost`. No exponer a red pública.

---

## Añadir una cuenta nueva

1. Crear el CSV con la misma estructura (con un registro de `Saldo Inicial`)
2. Añadir la entrada en `ARCHIVOS` en `app.py`
3. Añadir los tipos disponibles en `TIPOS_POR_CUENTA` en `app.py` y en `TIPOS_POR_CUENTA` en `index.html`
4. Añadir `{ type: '3m' }` para los paneles nuevos en `panelFilters` en `index.html`
5. Añadir un tab nuevo en el HTML y la rama correspondiente en `render()`
