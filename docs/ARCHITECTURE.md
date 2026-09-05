# Arquitectura — Estado actual → Objetivo

Documento de referencia para el refactor a FastAPI + arquitectura hexagonal, con frontend React y la integración real con IBKR dentro de alcance. Cada bloque de trabajo del plan (§8) se valida contra este documento y contra el golden-master harness (§7). No se implementa nada de esto hasta ejecutar el Bloque 0.

## 0. Decisiones ya tomadas

| Decisión | Elegido | Descarta |
|---|---|---|
| Store principal | **SQLite** vía puerto de repositorio. Import one-off de los CSV reales (con backup previo íntegro). Los CSV pasan a rol de import/export, no se reescriben en cada movimiento. | Mantener CSV como store principal; Postgres desde el inicio |
| Filtros temporales del dashboard | **Un único control global** por vista (Openbank/IBKR), resuelto como parámetro de rango en los endpoints de agregación (no 8 estados de filtro independientes) | Mantener los dos sistemas actuales (selector KPI + filtro por panel × 7 paneles) |
| Limpieza UI | Eliminar: columnas **Bal. Hist. / Crec. Hist.** (apuestas y carteras), **media móvil 30d** (gráfico saldo Openbank), **chips "Top del mes" + quick-picks de importe**. Mantener el donut de gastos. | — |
| Frontend | **React + TypeScript + Vite**, monorepo `backend/` + `frontend/`. Reemplaza el SPA vanilla JS actual. Se construye **después** de que la lógica financiera esté en el backend (Bloque 5, tras Bloque 4) para no reimplementar los cálculos dos veces. | Mantener vanilla JS; frameworks más pesados (Next.js) sin caso de uso para una app local de un usuario |
| Integración IBKR | **Dentro de alcance, real, lectura + escritura.** Adapter contra el Client Portal Gateway (CPGW) oficial de IBKR, incluye poder operar (colocar/cancelar órdenes). Cada operación de escritura exige confirmación explícita del usuario en el momento — sin automatización ni trading algorítmico. Es una app personal de un único usuario: él decide y confirma cada acción. | Dejarlo como stub/"proyecto aparte"; solo-lectura por defecto |
| Puerto de la app | **8000** (uvicorn), liberando el **5000** para el gateway CPGW, que lo tiene fijado en su propio `conf.yaml` | Mantener 5000 para la app (choca con el gateway) |

Estas decisiones ya condicionan el diseño de abajo.

## 1. Estado actual (as-is)

Monolito de 2 ficheros:

- **`app.py`** (280 líneas) — Flask, puerto 5000. `ARCHIVOS` mapea cuenta → CSV. Cada request de escritura carga el CSV entero con pandas, muta el DataFrame, recalcula `Saldo` desde cero (`recalcular_saldo`) y reescribe el fichero completo de forma atómica (`tempfile` + `os.replace`).
- **`index.html`** (2517 líneas) — SPA vanilla JS + Plotly (CDN) + CSS inline. Contiene **toda la lógica financiera** (`computeKPIs`, `computeIbkrKPIs`, `computeApuestas`, `computeInversiones`, `openCarterasSnapshot`, `periodSlices`, `rollingMean`, detección de transferencias por substring). El backend solo hace CRUD de filas.
- **Datos**: `openbank.csv` e `ibkr.csv` (reales, en `.gitignore`) — 316 y 18 filas. `openbank.example.csv`/`ibkr.example.csv` (versionados) solo tienen cabecera + `Saldo Inicial`: no ejercitan nada del dominio.
- **`clientportal.gw.zip`** (10.5MB, sin seguimiento en git) — el Client Portal Gateway oficial de IBKR, recién añadido al directorio de trabajo. Es un redistribuible propietario que incluye un keystore (`root/vertx.jks`) y una contraseña en claro en `conf.yaml` (`sslPwd: "mywebapi"`). **Ya añadido a `.gitignore`** — no debe entrar al historial de git bajo ninguna circunstancia; se documenta la URL de descarga en el README en vez de versionarlo.
- **CI**: `python -c "import app"` — smoke check de importación, no una suite de tests.
- **`run.sh`**: hardcodea `google-chrome` y el puerto 5000 (ya usa `uv run`, ver Bloque 0 — gestor de dependencias migrado de `pip`/`requirements.txt` a `uv`/`pyproject.toml` antes de lo previsto en el plan original).

Ambas cuentas comparten un esquema genérico de 5 columnas (`Fecha, Tipo, Concepto, Total, Saldo`), diferenciadas solo por `TIPOS_POR_CUENTA` (**duplicado literal** en `app.py:17-20` e `index.html:758-761`). IBKR se modela como cuenta corriente: `Inversión`/`Inversión_r` son flujos de caja con `Concepto` de texto libre, sin activo, cantidad, precio de compra ni precio objetivo, y **sin ninguna conexión a IBKR real** — todo el dato es introducido a mano.

### Problemas concretos que fijan el diseño objetivo

| Código | Problema | Consecuencia |
|---|---|---|
| `app.py:44-51` (`guardar`) | Reescribe el CSV real completo en cada escritura | Mayor riesgo activo sobre datos que no pueden perderse |
| `app.py:95-97`, `169` | `_idx` es la posición en el array tras ordenar por fecha | Insertar con fecha retroactiva desplaza índices; `DELETE` no recibe id, borra "el último" |
| `app.py:36-41` | `Saldo` es estado derivado pero se persiste y se recalcula por barrido completo | Debe ser estado calculado, no columna mutable |
| `app.py:101-119` | Invariantes de dominio devuelven tuplas `jsonify` | Dominio acoplado a HTTP/Flask |
| `app.py:17-20` vs `index.html:758-761` | `TIPOS_POR_CUENTA` duplicado | Fuente de verdad partida en dos lenguajes |
| `app.py:279`, `run.sh`, README | Puerto **5000** hardcodeado | Choca con el puerto por defecto del CPGW de IBKR (`conf.yaml: listenPort: 5000`) |
| `index.html:1371-1381` | Transferencias detectadas por `Concepto.includes('desde openbank')` | Heurística de texto en vez de relación explícita |
| `index.html`: `chartGastos`/`chartCarteras`, `computeApuestas`/`computeInversiones` | Pares casi idénticos sobre distinto `Tipo` | Lógica financiera redundante |
| `ibkr.csv` | Sin activo, cantidad, precio de compra, precio objetivo ni conexión a IBKR | Bloquea la tarea de mejorar la gestión de inversión |
| `.github/workflows/ci.yml` | `import app` deja de tener sentido en cuanto `app.py` se descompone y aparece un frontend Node | CI debe testear dominio/aplicación y build de frontend |

## 2. Arquitectura objetivo (to-be)

Monorepo: `backend/` (FastAPI + hexagonal) y `frontend/` (React + TypeScript + Vite). Dos puertos reales en el dominio:

1. **Puerto de repositorio** (persistencia): CSV (transitorio, golden master) → SQLite (definitivo).
2. **Puerto de broker** (`BrokerGateway`, **lectura + escritura**): dos implementaciones reales desde el día uno — adapter CPGW (IBKR real, incluye colocar/cancelar órdenes) y adapter manual (el usuario introduce precio/posición a mano; sin operativa real). No hay un tercer puerto ni un stub: ambas implementaciones son necesarias porque la sesión de IBKR es interactiva y puede no estar disponible (ver §4). Toda operación de escritura pasa por una confirmación humana explícita en la capa de aplicación — el puerto expone la capacidad, el caso de uso la condiciona.

```
backend/
  app/
    domain/
      entities.py        # Account, Movement, Transfer, Asset, Position, Portfolio, Trade
      value_objects.py   # Money, MovementType, AccountKind, Quote(price, as_of, source)
      services/
        ledger.py          # invariantes tipo/concepto, recálculo de saldo
        betting.py          # agregados de apuestas
        portfolio.py         # agregados de carteras, P&L realizado y no realizado
    application/
      ports/
        repository.py       # AccountRepository, MovementRepository, PortfolioRepository (Protocol)
        broker.py             # BrokerGateway (Protocol) — get_quote, get_positions, get_session_status, place_order, cancel_order
      use_cases/
        add_movement.py, edit_movement.py, delete_movement.py,
        transfer_between_accounts.py, close_position.py,
        get_account_summary.py, get_betting_report.py, get_portfolio_report.py,
        sync_broker_positions.py   # job/acción explícita, nunca bloqueante en el request path
    infrastructure/
      persistence/
        csv/                 # adapter CSV (Bloque 2) — transitorio
        sqlite/               # adapter SQLAlchemy + SQLite (Bloque 3) — definitivo
      broker/
        ibkr_cpgw.py          # adapter real contra el Client Portal Gateway: lectura + órdenes (Bloque 6)
        manual.py              # adapter de entrada manual (precio/posición a mano, sin operativa real) (Bloque 6)
    interfaces/
      api/
        routers/              # accounts.py, movements.py, portfolios.py, transfers.py, broker.py
        schemas/               # pydantic request/response
  tests/                      # fixtures + snapshots de outputs del app.py/index.html actuales
                               # (referencia temporal de la transición, ver §0 -- se retira al
                               #  cerrar el refactor, no es infraestructura de test permanente)
    domain/
    application/
frontend/
  src/
    api/                      # cliente HTTP tipado hacia backend (nunca habla con el CPGW directamente)
    features/
      accounts/, movements/, betting/, portfolios/, transfers/
    components/
  vite.config.ts               # dev proxy → backend:8000
docs/
  ARCHITECTURE.md
```

**Regla de dependencia**: `domain` no importa nada de `application`/`infrastructure`/`interfaces`. `application` depende solo de `domain` + puertos. `infrastructure` implementa los puertos. `interfaces` orquesta casos de uso vía FastAPI. El **frontend solo habla con el backend** — nunca directamente con el CPGW (evita CORS/certificado autofirmado/cookies de sesión en el navegador; el `conf.yaml` del gateway ya tiene `allowCredentials: false`, lo que rompería una llamada browser→gateway).

### 2.1 Esquema relacional (SQLite, Bloque 3)

Cuentas y carteras son **filas**, no tablas ni ficheros. Añadir una cuenta nueva es un `INSERT` en `accounts`, nunca tocar código (elimina el proceso manual de 5 pasos que el README actual documenta para "añadir una cuenta nueva").

```
accounts        id PK, name, kind (CASH | INVESTMENT), currency
movements       id PK, account_id FK→accounts, occurred_at, type, concept, amount, transfer_link_id FK→transfers (nullable)
transfers       id PK, from_account_id FK→accounts, to_account_id FK→accounts, amount, occurred_at, movement_out_id FK→movements, movement_in_id FK→movements

portfolios      id PK, account_id FK→accounts, cash_balance
assets          id PK, ticker (unique), name, currency
positions       id PK, portfolio_id FK→portfolios, asset_id FK→assets, quantity, avg_buy_price, target_price
trades          id PK, position_id FK→positions, type (BUY|SELL), quantity, price, executed_at
```

- `Saldo` no es una columna persistida por fila (hoy se reescribe entera en cada movimiento) — se calcula bajo demanda o se cachea aparte, nunca se muta fila a fila.
- `transfer_link_id` reemplaza la heurística actual de `isTransferIn`/`isTransferOut` (detectar transferencias por texto libre en `Concepto`).
- Una cuenta `INVESTMENT` tiene un `portfolio` (1:1 por defecto); `positions` cuelga del `portfolio`, no de la cuenta — una cartera admite N activos sin tocar el esquema.
- `openbank.csv`/`ibkr.csv` como nombres de fichero desaparecen del todo: pasan a ser dos filas en `accounts`, indistinguibles en esquema de cualquier cuenta añadida después.

## 3. Comparación 1:1

| Pieza actual | Estado objetivo | Responsabilidad | Acción |
|---|---|---|---|
| `app.py` (monolito Flask, puerto 5000) | `backend/app/interfaces/api/` (FastAPI, puerto 8000) + `application/use_cases/` | Orquestación HTTP vs. casos de uso | **Descomponer** |
| `ARCHIVOS = {...}` | Tabla `accounts` en SQLite + `AccountRepository` | Registro de cuentas config-driven | **Mover** a datos |
| `TIPOS_POR_CUENTA` (duplicado) | `value_objects.py`, expuesto por `/api/accounts/{id}/config` | Única fuente de verdad | **Eliminar duplicación** |
| `cargar()` / `guardar()` | `CSVRepository` (Bloque 2) → `SQLiteRepository` (Bloque 3) | I/O de persistencia | **Mover** tras puerto |
| `recalcular_saldo()` | `LedgerService.balance_as_of(...)` | Saldo calculado, no columna mutable | **Modificar** |
| `_validar_tipo_concepto()` | `LedgerService`, excepciones de dominio | Reglas de negocio puras | **Mover y desacoplar** |
| `_idx` posicional | `Movement.id: UUID` | Identidad estable | **Corregir** (bug de correctitud) |
| `index.html` (SPA vanilla, 2517 líneas) | `frontend/` (React + TS + Vite), consumidor puro de los endpoints de agregación | Presentación | **Reescribir** (Bloque 5, tras Bloque 4) |
| `computeKPIs`/`computeIbkrKPIs`/`computeApuestas`/`computeInversiones` (navegador) | `application/use_cases/get_*_report.py` → endpoints `/api/accounts/{id}/summary`, `/api/bets`, `/api/portfolios` | Cálculo financiero en backend | **Mover** (Bloque 4), React lo consume directo (Bloque 5) |
| `chartGastos`/`chartCarteras` (casi idénticas) | Un agregado `ranking_by_concept` servido por backend | Cálculo único | **Fusionar** |
| `isTransferIn`/`isTransferOut` (string-match) | Entidad `Transfer` con `movement_out_id`/`movement_in_id` | Relación explícita | **Reemplazar** heurística |
| Selector KPI + `panelFilters` (8 estados) | Un parámetro de rango (`since`/`until`) en los endpoints de agregación, un único control en React | Estado de UI simplificado | **Colapsar** (Bloque 4, se refleja en UI en Bloque 5) |
| Columnas históricas acumulativas, media móvil, chips/quick-picks | — | Bajo valor, ruido visual | **Eliminar** (no se portan a React) |
| `openbank.example.csv`/`ibkr.example.csv` (2 líneas) | Fixture sintético realista (gastos, nómina, apuestas y carteras abiertas/cerradas, transferencias) | Dataset que ejercita el dominio | **Ampliar** (Bloque 0) |
| — (no existe hoy) | `ibkr_cpgw.py`: adapter que habla con el Client Portal Gateway local (`https://localhost:5000` server-side), expone estado de sesión, posiciones, quotes y ejecución de órdenes (confirmadas por el usuario) | Integración real IBKR, lectura + escritura | **Crear** (Bloque 6) |
| `clientportal.gw.zip` en el directorio de trabajo | Ignorado por git; documentado en README (URL de descarga + `bin/run.sh root/conf.yaml`) | Dependencia de runtime externa, no del repo | **No versionar** (ya en `.gitignore`) |
| `pyproject.toml` (flask, pandas, gestionado con `uv` desde el Bloque 0) | Añadir fastapi, uvicorn, sqlalchemy, pydantic, httpx (cliente hacia CPGW) al mismo mecanismo `uv`/`pyproject.toml`; si el monorepo separa `backend/`, el fichero se mueve ahí | Dependencias del stack objetivo | **Ampliar** (el gestor de paquetes ya no cambia, solo las dependencias) |
| `run.sh` (venv/chrome/puerto 5000 hardcodeados) | Script portable: levanta backend (8000) y frontend (Vite dev o build servido), sin asumir navegador/venv concretos | Arranque reproducible | **Reescribir** |
| `.github/workflows/ci.yml` (`import app`) | pytest (`domain`/`application`) + build de `frontend/` + lint | CI real | **Reescribir** |
| `openbank.csv`/`ibkr.csv` (reales) | Import one-off a SQLite (Bloque 3), con backup e invariantes | Dato real preservado | **Migrar con verificación** |

## 4. Modelo de dominio de inversión (Tarea 3) e integración IBKR

### Modelo de posiciones

```
Asset       { id, ticker, name, currency }
Position    { id, portfolio_id, asset_id, quantity, avg_buy_price, target_price }
Portfolio   { id, account_id, cash_balance }
Trade       { id, position_id, type(BUY|SELL), quantity, price, executed_at }
```

### Por qué el broker port necesita dos implementaciones reales, no una + stub

La autenticación del Client Portal Gateway es **interactiva**: el usuario levanta el gateway (proceso Java local, `bin/run.sh root/conf.yaml`, puerto 5000, TLS autofirmado), abre `https://localhost:5000` en un navegador y hace login con sus credenciales IBKR (SSO, posible 2FA). No hay API key headless. Consecuencias de diseño:

- **La disponibilidad de datos IBKR es intermitente por naturaleza** (gateway no levantado, sesión caducada, usuario no ha hecho login todavía). Esto no es un detalle de infraestructura, es parte del dominio: cada valor derivado de IBKR (precio, posiciones) lleva un estado de frescura — `Quote { price, as_of, source }` con `source ∈ {LIVE, STALE, MANUAL}` — que se expone en la API y se renderiza en la UI ("gateway offline" es preferible a mostrar una cotización de hace tres días como si fuera actual).
- **Ningún endpoint de la app bloquea en la disponibilidad del gateway.** La sincronización (`sync_broker_positions`) es una acción explícita o un job de fondo, nunca parte del camino crítico de una request. La app debe ser completamente usable con el gateway apagado — la entrada manual sigue siendo la vía primaria, porque esto es un sistema de gestión personal, no un terminal de trading.
- **El adapter vive en el servidor** (`backend/app/infrastructure/broker/ibkr_cpgw.py`), nunca en el navegador: el frontend React solo habla con FastAPI.
- **Lectura + escritura, con confirmación humana obligatoria.** El adapter CPGW expone también `place_order`/`cancel_order` del Client Portal Web API — es una app personal de un único usuario y quiere poder operar desde su propio dashboard. La restricción no está en el puerto (que sí expone la capacidad), sino en el caso de uso de aplicación: ninguna orden se ejecuta sin una acción explícita del usuario en el momento (confirmación en UI, sin colas ni reglas automáticas que disparen órdenes por sí solas). El detalle del flujo de confirmación (qué se muestra, qué se re-verifica antes de enviar) se define al implementar el Bloque 6, no aquí.

Las rutas concretas del Web API (estado de sesión, keep-alive, posiciones, quotes) se verifican contra el swagger real del gateway en ejecución (o `interactivebrokers.github.io/cpwebapi`) al implementar el Bloque 6 — no se fijan aquí de memoria.

### El fork de `ibkr.csv` (ahora con una capa más)

Los 18 movimientos reales son flujos de caja (`Inversión`/`Inversión_r`) por `Concepto` libre, sin ticker ni cantidad. Con IBKR real en alcance, la migración del Bloque 6 debe resolver dos preguntas, no una:

1. Cómo traducir el histórico (`Concepto` → `Position` "legacy" sin ticker real, o preservarlo aparte como historial de flujos).
2. **Cómo reconcilian** los datos que reporte el gateway (posiciones/cantidades reales) contra el histórico introducido a mano: ¿el dato del broker se vuelve autoritativo desde el momento de la primera sincronización, solo anota/enriquece el registro manual, o conviven como dos fuentes visibles por separado?

Se resuelve con dry-run, dataset de prueba y verificación de invariantes (capital total sin cambios) antes de tocar el dato real — igual que cualquier migración de datos reales en este proyecto.

## 5. Fuera de alcance (explícitamente)

- **Trading automatizado o algorítmico** — cualquier orden hacia IBKR exige una acción explícita del usuario en el momento; no hay bots, reglas ni ejecución programática sin confirmación humana (ver §4).
- Multiusuario / autenticación de la app — es una app local de un usuario.
- Postgres, colas, cache — sin caso de uso hoy.
- DI container, CQRS, event sourcing — sobre-ingeniería para 2 cuentas y ~350 filas.
- Automatizar el login SSO/2FA del gateway — no es técnicamente posible sin credenciales interactivas; el usuario levanta y autentica el gateway él mismo.

## 6. Restricción de puertos de red

FastAPI en **8000**. El Client Portal Gateway tiene **5000** fijado en su propio `conf.yaml` (reeditarlo obliga a repetir el cambio en cada descarga nueva del gateway). `run.sh`, el README y el golden-master harness usan 8000 desde el Bloque 1.

## 7. Garantía sobre datos reales — golden-master harness

Antes de mover una sola línea de `app.py`/`index.html`:

1. Backup íntegro de `openbank.csv`/`ibkr.csv` fuera del repo.
2. Fixture sintético ampliado en los `.example.csv`: gastos, nómina, devoluciones, apuestas abiertas/cerradas, inversiones abiertas/cerradas, transferencias.
3. Script que golpea los 7 endpoints actuales y serializa la respuesta; snapshot adicional de los valores que hoy calcula el frontend (`computeKPIs`, `computeApuestas`, `computeInversiones`, etc.) contra ese fixture.
4. Tests que comparan cualquier cambio futuro contra ese snapshot.

Este mismo snapshot es el **test de aceptación del rewrite a React** (Bloque 5): mismo fixture de entrada, mismos números renderizados, solo cambia la tecnología de presentación. Ningún bloque se da por válido si no pasa este harness.

**Naturaleza temporal.** Este harness (`tests/`: `scenario.py`, `run_frontend_harness.mjs`, `snapshot_*.json`, `extract_frontend_values.py`) protege la transición mientras dura el refactor -- no es infraestructura de test permanente del repo. Referencia explícitamente `index.html` (vanilla, ya no servido) y el `app.py`/Flask original. Cuando el refactor se dé por cerrado sin reservas, se retira y `tests/` queda con la suite de tests "de servicio" normal del proyecto (dominio, aplicación, API), sin artefactos que cuenten la historia de la migración. Documentado aquí y en el propio historial de commits -- no en el estado final del repo.

## 8. Plan de bloques (commits independientes)

| # | Bloque | Contenido | Toca |
|---|---|---|---|
| 0 | Golden master | Backup real, fixture sintético, harness de snapshot | Ninguno de los dos |
| 1 | Esqueleto FastAPI + hexagonal | Estructura de carpetas, puerto 8000, FastAPI sirviendo `index.html` sin cambios, CI actualizado (harness en verde) | Backend (mínimo) |
| 2 | Extraer dominio sobre CSV | `Movement`/`Account`/`LedgerService`, `CSVRepository` tras el puerto, `Movement.id` UUID | Backend |
| 3 | Migración a SQLite | Import one-off con backup + invariantes, `SQLiteRepository`, CSV a import/export | Backend |
| 4 | Mover lógica financiera al backend | Endpoints de agregación con parámetro de rango único; `index.html` vanilla se adapta a consumirlos (paridad total, sin limpieza todavía) | Backend + frontend vanilla |
| 5 | Rewrite frontend a React | Monorepo `frontend/` (TS + Vite), consumidor puro de los endpoints del Bloque 4, con la limpieza de UI ya aplicada (filtro único, sin columnas históricas/media móvil/chips). Acceptance test = snapshot del Bloque 0 | Frontend (reemplaza `index.html`) |
| 6 | Modelo de inversión + IBKR real | `Asset`/`Position`/`Portfolio`/`Trade`, `BrokerGateway` con adapters CPGW + manual, freshness, migración/reconciliación de `ibkr.csv` | Backend + frontend |
| 7 | Empaquetado OSS | README nuevo (incluye instrucciones del CPGW), CONTRIBUTING, LICENSE, `run.sh` portable, CI con build de frontend + pytest + lint | Periférico |

Cada bloque es un commit (o serie corta) independiente y revertible. No se empieza el Bloque 1 sin el Bloque 0 en verde.
