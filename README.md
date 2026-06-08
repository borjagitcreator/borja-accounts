# Cuentas — Panel de control financiero personal

Interfaz web local para llevar el seguimiento de dos cuentas (Openbank e IBKR). Permite añadir movimientos, visualizar estadísticas y analizar apuestas/inversiones, con los datos guardados en CSV.

---

## Estructura de archivos

```
Cuentas/
├── app.py              ← Backend Flask (servidor y API)
├── index.html          ← Frontend completo (UI, gráficos, tablas)
├── requirements.txt    ← Dependencias Python
├── openbank.csv        ← Datos de Openbank
├── ibkr.csv            ← Datos de IBKR
└── README.md
```

---

## Puesta en marcha

```bash
pip install -r requirements.txt

# Los CSV con datos reales (openbank.csv, ibkr.csv) están en .gitignore.
# En un clon nuevo, arranca a partir de los ejemplos:
cp openbank.example.csv openbank.csv
cp ibkr.example.csv ibkr.csv

python app.py
```

Abre el navegador en: **http://localhost:5000**

El servidor arranca con `debug=True` y `use_reloader=False`. El modo debug activa el traceback interactivo; `use_reloader=False` evita el doble proceso del reloader de Werkzeug (el puerto se libera limpiamente con Ctrl+C).

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
| Inversión    | Inversión     | Resta              | Dinero enviado a una cartera/posición     |
| Inversión_r  | Retorno inv.  | Suma               | Retorno recibido de una posición          |

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

Cada panel de datos tiene sus propios botones de filtro temporal integrados en su cabecera. Los filtros son independientes entre paneles: puedes ver el gráfico mensual del último trimestre mientras la tabla de movimientos muestra todo el historial.

Opciones disponibles (se ocultan si no hay datos en ese rango):
- `Todo` — todos los registros del historial
- `6m` — últimos 180 días
- `3m` — últimos 90 días
- `1m` — últimos 30 días
- Un botón por cada año con datos registrados

Los paneles con filtro temporal propio son: **Evolución del saldo**, **Evolución mensual**, **Gastos por concepto**, **Análisis de Apuestas** (y **Análisis de Inversiones** en IBKR). La tabla de movimientos no usa filtro temporal: tiene su propio buscador (ver más abajo).

> Cambiar un filtro de panel actualiza solo ese panel — el formulario de añadir movimientos nunca se reconstruye, por lo que no se pierden datos introducidos a medias.

#### Gráfico: Evolución del saldo
- Línea azul: saldo a lo largo del tiempo
- Línea roja discontinua: media móvil de 30 días
- Filtro temporal de panel (mismo sistema que el resto de paneles)

#### Gráfico: Evolución mensual
Barras verdes (ingresos) y rojas (gastos) por mes, con línea amarilla de balance neto. Respeta el filtro temporal del panel. Usa los mismos criterios que el KPI Balance: ingresos = todos los tipos que suman (excluyendo `Saldo Inicial`), gastos = todos los tipos que restan.

#### Gráfico: Top 20 gastos por concepto
Barras horizontales con los 20 conceptos de tipo `Gasto` con mayor valor, ordenados de mayor a menor. Tiene dos modos seleccionables con botones:

- **Media/mes** — muestra el gasto medio mensual de cada concepto. El divisor es el tamaño de la ventana seleccionada: `1m` → ÷1, `3m` → ÷3, `6m` → ÷6, `Todo`/año → número de meses distintos con algún gasto en el período.
- **Total** — muestra el total acumulado de cada concepto en el período seleccionado.

#### Análisis de Apuestas
Tabla con las rondas de apuestas **cerradas** (que tienen al menos un `Cobro apuesta`). Las rondas abiertas no aparecen. Respeta el filtro temporal del panel (solo muestra rondas cuyo cierre cae dentro del período).

| Columna     | Descripción                                            |
|-------------|--------------------------------------------------------|
| Concepto    | Nombre de la ronda (ej: "B365 - 12")                   |
| Inicio      | Fecha del primer `Apuestas` de esa ronda               |
| Retorno     | Fecha del último `Cobro apuesta` de esa ronda          |
| Banca       | Total apostado en esa ronda                            |
| Devuelto    | Total retornado en esa ronda                           |
| Balance     | Devuelto − Banca                                       |
| Crec.       | Crecimiento porcentual de la banca en esa ronda        |
| Bal. Hist.  | Balance acumulado hasta esa ronda (cumsum)             |
| Crec. Hist. | Crecimiento histórico acumulado respecto a banca total |

#### Tabla de movimientos y buscador
La tabla (columna izquierda) muestra **los últimos 20 movimientos** por defecto, ordenados del más reciente al más antiguo. El importe aparece en verde (suma) o rojo (resta) según el tipo. El indicador junto al título muestra "Últimos 20" o el número de resultados de la búsqueda activa.

Encima de la tabla hay un **buscador** de tres campos que filtra contra toda la base de datos de la cuenta:
- **Tipo** — desplegable: "Todos los tipos" o uno concreto.
- **Concepto** — texto con autocompletado; las sugerencias son los conceptos existentes, filtrados por el tipo elegido si hay uno.
- **Fecha** — texto con autocompletado en formato `AAAA-MM-DD`; las sugerencias se acotan a las fechas que existen para el tipo y concepto ya seleccionados (matching incremental).

Con cualquier campo de búsqueda activo se muestran todos los resultados coincidentes (hasta 500); al limpiar la búsqueda (botón **Limpiar**) vuelve a los últimos 20. La búsqueda se reinicia al cambiar de cuenta o tras guardar/borrar un movimiento.

#### Formulario: Añadir movimiento
A la derecha de la tabla de movimientos. Campos:
Campos:
- **Fecha** — por defecto hoy
- **Tipo** — desplegable con los tipos disponibles para Openbank (nombres de UI)
- **Concepto** — texto libre con autocompletado contextual
- **Total** — importe en euros + botones rápidos 50 / 100 / 200 / 500 / 1000 €

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

Vista centrada en inversiones:
- **KPI saldo actual** — último balance real de la cuenta
- **Análisis de Inversiones** — tabla de posiciones cerradas con filtro temporal propio
- **Formulario: Añadir movimiento** — misma funcionalidad que en Openbank, con los tipos de IBKR (`Gasto`, `Ingreso`, `Inversión`, `Inversión_r`)

#### Análisis de Inversiones

| Columna    | Descripción                                     |
|------------|-------------------------------------------------|
| Concepto   | Nombre de la posición/cartera (ej: "Cartera 1") |
| Inicio     | Fecha de la primera `Inversión`                 |
| Retorno    | Fecha del último `Retorno inv.`                 |
| Invertido  | Total invertido                                 |
| Devuelto   | Total retornado                                 |
| Balance    | Devuelto − Invertido                            |
| ROI        | Return on Investment porcentual                 |
| Bal. Hist. | Balance acumulado (cumsum)                      |
| ROI Hist.  | ROI histórico acumulado sobre el total invertido|

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
| GET    | `/api/data/<cuenta>`             | Todos los movimientos de la cuenta como JSON    |
| POST   | `/api/movimiento/<cuenta>`       | Añade un movimiento y recalcula el saldo        |
| DELETE | `/api/movimiento/<cuenta>`       | Borra el último movimiento y recalcula el saldo |
| POST   | `/api/transferencia`             | Registra una transferencia en ambas cuentas     |
| GET    | `/api/ultima_apuesta_r/<cuenta>` | Último `Apuestas_r` registrado (no usado en UI) |

---

## Notas de arquitectura

- **Todo el análisis corre en el frontend.** El backend solo hace CRUD y recálculo de saldo. No hay queries ni lógica de negocio en el servidor.
- **Filtros por panel, no por página.** Cada panel temporal (saldo, mensual, gastos, apuestas, inversiones) y el buscador de movimientos tienen estado independiente. Cambiar un filtro o buscar lanza una actualización quirúrgica del DOM solo en ese panel — el formulario de añadir movimientos nunca se reconstruye.
- **Controles del formulario "Añadir movimiento".** El bloque NO es un `<form>` y sus campos NO llevan `required`: es un `<div id="add-form">` y el envío se dispara con el `onclick` del botón (`submitMov()`), validando en JS. En el Firefox del entorno, los popups nativos de `<select>` y `<input type="date">` dejaban de abrirse cuando el control estaba dentro de un `<form>` con `required` (el resto de selects/fechas de la página —buscador, modal— nunca tuvieron ese combo y siempre funcionaron). Si se vuelve a envolver en `<form>`/`required`, el bug reaparece.
- **`color-scheme: dark`** está definido en `:root` y en `input, select` para que los popups nativos (calendario, desplegables, scrollbars) se rendericen en tema oscuro.
- **Layout de objetos Plotly.** La función `baseLayout()` devuelve un objeto fresco en cada llamada. Compartir el mismo objeto entre charts causa mutación y ejes rotos.
- **Saldo chart:** usa `xaxis.type: 'date'` explícito y recibe siempre el historial completo (sin filtrar).
- **Chart mensual:** usa `xaxis.type: 'category'` porque los meses son strings `YYYY-MM`.
- **Chart gastos:** usa `xaxis.type: 'linear'` explícito y `hovermode: 'closest'` para evitar heredar el tipo `date` del chart de saldo.
- **Fechas en CSV** se guardan en formato `%Y-%m-%d %H:%M:%S.%f` para preservar microsegundos y garantizar el ordenamiento estable con `mergesort`.
- **Plotly.js** se carga desde CDN. Sin conexión a internet los gráficos no se renderizarán.
- Flask corre en `localhost` únicamente. No exponerlo a red pública.

---

## Añadir una cuenta nueva

1. Crear el CSV con la misma estructura (con un registro de `Saldo Inicial`)
2. Añadir la entrada en `ARCHIVOS` en `app.py`
3. Añadir los tipos disponibles en `TIPOS_POR_CUENTA` en `app.py` y en `TIPOS_POR_CUENTA` en `index.html`
4. Añadir `{ type: 'all' }` para los paneles nuevos en `panelFilters` en `index.html`
5. Añadir un tab nuevo en el HTML y la rama correspondiente en `render()`
