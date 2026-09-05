"""
Escenario determinista contra la app FastAPI actual (app/main.py), ejecutado
siempre sobre una copia aislada de openbank.example.csv / ibkr.example.csv,
importada a una base SQLite temporal — nunca contra los CSV ni la DB
reales. Dos capas de aislamiento a propósito (ver memoria de proyecto sobre
el incidente del Bloque 2): os.chdir(tmp) Y una BORJA_ACCOUNTS_DB apuntando
a un fichero temporal explícito, para que un futuro cambio en cualquiera de
las dos rutas de resolución no abra por accidente el estado real.

`run_scenario()` devuelve un dict serializable que sirve tanto para congelar
el snapshot inicial (generate_snapshot.py) como para compararlo en cada
bloque futuro del refactor (test_golden_master.py). Cualquier cambio de
comportamiento intencional se congela de nuevo ejecutando
`generate_snapshot.py` a mano — nunca se actualiza el snapshot para que un
test en rojo se calle solo.

El snapshot congelado se generó originalmente contra el app.py (Flask) que
existía hasta el Bloque 1, sobre CSV. Que este escenario siga pasando contra
FastAPI + SQLite, sin regenerar el snapshot, ES la prueba de paridad entre
las tres generaciones del backend.
"""
import importlib.util
import os
import shutil
import sys
import tempfile

from fastapi.testclient import TestClient

# Mismo instante que FIXED_NOW en run_frontend_harness.mjs -- ambos harnesses
# deben congelar "ahora" en el mismo punto para que sus resultados casen.
FIXED_REFERENCE_NOW = "2026-07-15T12:00:00+00:00"


def _load_app_module(repo_root):
    spec = importlib.util.spec_from_file_location("app_under_test", os.path.join(repo_root, "app", "main.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _seed_sqlite_from_fixture(repo_root, csv_dir, db_path):
    sys.path.insert(0, repo_root)
    from infrastructure.persistence.csv.repository import ARCHIVOS, CSVMovementRepository
    from infrastructure.persistence.sqlite.repository import SQLiteMovementRepository

    archivos = {k: os.path.join(csv_dir, v) for k, v in ARCHIVOS.items()}
    csv_repo = CSVMovementRepository(archivos)
    sqlite_repo = SQLiteMovementRepository(db_path)
    for account_id in ARCHIVOS:
        sqlite_repo.save(account_id, csv_repo.load(account_id))


def run_scenario(repo_root):
    tmp = tempfile.mkdtemp(prefix="golden_master_")
    try:
        shutil.copy(os.path.join(repo_root, "openbank.example.csv"), os.path.join(tmp, "openbank.csv"))
        shutil.copy(os.path.join(repo_root, "ibkr.example.csv"), os.path.join(tmp, "ibkr.csv"))
        db_path = os.path.join(tmp, "test.db")
        _seed_sqlite_from_fixture(repo_root, tmp, db_path)

        cwd_before = os.getcwd()
        env_before = os.environ.get("BORJA_ACCOUNTS_DB")
        reference_env_before = os.environ.get("BORJA_ACCOUNTS_REFERENCE_NOW")
        os.chdir(tmp)
        os.environ["BORJA_ACCOUNTS_DB"] = db_path
        os.environ["BORJA_ACCOUNTS_REFERENCE_NOW"] = FIXED_REFERENCE_NOW
        try:
            appmod = _load_app_module(repo_root)
            client = TestClient(appmod.app)

            # GET / debe servir el shell HTML de la app. Hasta el Bloque 5
            # esto comparaba index.html byte a byte -- una vez el fichero
            # servido pasa a ser un build artifact (frontend/dist/index.html,
            # ver app/main.py), su hash cambia en cada `npm run build` y la
            # comparación exacta deja de tener sentido. Se debilita aquí,
            # ANTES de tocar app/main.py, para que el commit que enchufa
            # React sea el único que puede romper esta prueba.
            index_response = client.get("/")
            assert index_response.status_code == 200, "GET / no responde 200"
            assert index_response.headers["content-type"].startswith("text/html"), "GET / no sirve HTML"
            assert len(index_response.content) > 0, "GET / sirve una respuesta vacía"

            result = {}

            # --- Snapshot A: solo lectura sobre el fixture intacto ---
            result["initial_patrimonio"] = client.get("/api/patrimonio").json()
            result["initial_data_openbank"] = client.get("/api/data/openbank").json()
            result["initial_data_ibkr"] = client.get("/api/data/ibkr").json()

            # Endpoints de agregación (Bloque 4): el frontend deja de calcular
            # esto localmente y lo consume de aquí. run_frontend_harness.mjs
            # lee estas mismas claves para alimentar las funciones de
            # presentación (kpiCardsHtml, ...) y comparar contra
            # snapshot_frontend.json, que no se regenera.
            result["openbank_kpis_by_period"] = {
                period: client.get(f"/api/accounts/openbank/kpis?period={period}").json()
                for period in ("mes", "trimestre", "año")
            }
            # panelFilters.apuestas por defecto en index.html es {type: '3m'} --
            # coincide con el rango que ya capturó snapshot_frontend.json.
            result["openbank_apuestas_report_3m"] = client.get(
                "/api/accounts/openbank/apuestas?range=3m"
            ).json()
            result["ibkr_kpis_by_period"] = {
                period: client.get(f"/api/accounts/ibkr/ibkr-kpis?period={period}").json()
                for period in ("mes", "trimestre", "año")
            }
            # panelFilters.inversiones por defecto en index.html es {type: '3m'}.
            result["ibkr_carteras_report_3m"] = client.get(
                "/api/accounts/ibkr/carteras?range=3m"
            ).json()
            # panelFilters.transferencias por defecto en index.html es {type: '3m'}.
            result["ibkr_transferencias_report_3m"] = client.get(
                "/api/accounts/ibkr/transferencias?range=3m"
            ).json()
            result["openbank_gastos_mes_actual"] = client.get(
                "/api/accounts/openbank/gastos-mes-actual"
            ).json()
            # panelFilters.gastos por defecto es {type:'3m'}; gastosMode por defecto es 'media'.
            result["openbank_gastos_ranking_3m_media"] = client.get(
                "/api/accounts/openbank/gastos-ranking?range=3m&mode=media"
            ).json()
            # El harness frontend fuerza panelFilters.{saldo,mensual,gastos,carteras}=
            # {type:'all'} solo para las capturas "*_charts_all" (histórico completo)
            # -- ver run_frontend_harness.mjs.
            result["openbank_gastos_ranking_all_media"] = client.get(
                "/api/accounts/openbank/gastos-ranking?range=all&mode=media"
            ).json()
            result["openbank_saldo_evolucion_all"] = client.get(
                "/api/accounts/openbank/saldo-evolucion?range=all"
            ).json()
            result["openbank_mensual_evolucion_all"] = client.get(
                "/api/accounts/openbank/mensual-evolucion?range=all"
            ).json()
            result["ibkr_saldo_evolucion_all"] = client.get(
                "/api/accounts/ibkr/saldo-evolucion?range=all"
            ).json()
            # carterasMode por defecto en index.html es 'total' (a diferencia de
            # gastosMode, que es 'media').
            result["ibkr_carteras_ranking_all_total"] = client.get(
                "/api/accounts/ibkr/carteras-ranking?range=all&mode=total"
            ).json()

            # --- Snapshot B: secuencia determinista de mutaciones ---
            steps = []

            def call(label, method, path, json_body=None):
                fn = getattr(client, method)
                resp = fn(path, json=json_body) if json_body is not None else fn(path)
                steps.append({
                    "label": label,
                    "method": method.upper(),
                    "path": path,
                    "request": json_body,
                    "status": resp.status_code,
                    "response": resp.json(),
                })

            call("alta_gasto_simple", "post", "/api/movimiento/openbank", {
                "tipo": "Gasto", "concepto": "Test Cafetería", "total": 4.50, "fecha": "2026-07-16",
            })
            call("alta_gasto_para_devolucion", "post", "/api/movimiento/openbank", {
                "tipo": "Gasto", "concepto": "Prueba Devolución X", "total": 30.00, "fecha": "2026-07-16",
            })
            call("alta_devolucion", "post", "/api/movimiento/openbank", {
                "tipo": "Devolución", "concepto": "Prueba Devolución X", "total": 30.00, "fecha": "2026-07-17",
            })
            call("cierre_parcial_cartera_global", "post", "/api/movimiento/ibkr", {
                "tipo": "Inversión_r", "concepto": "Cartera Global", "total": 200.00, "fecha": "2026-07-16",
            })

            # idx de "Test Cafetería" tras las altas anteriores: se resuelve leyendo
            # el estado actual en vez de asumir una posición fija.
            data_ob = client.get("/api/data/openbank").json()
            idx_cafeteria = next(r["_idx"] for r in data_ob if r["Concepto"] == "Test Cafetería")
            call("edita_gasto_cafeteria", "put", "/api/movimiento/openbank", {
                "idx": idx_cafeteria, "tipo": "Gasto", "concepto": "Test Cafetería", "total": 5.00,
            })

            call("borra_ultimo_openbank", "delete", "/api/movimiento/openbank")

            call("transferencia_ibkr_a_openbank", "post", "/api/transferencia", {
                "origen": "ibkr", "destino": "openbank", "total": 100.00, "fecha": "2026-07-18",
            })

            result["mutation_steps"] = steps
            result["final_patrimonio"] = client.get("/api/patrimonio").json()
            result["final_data_openbank"] = client.get("/api/data/openbank").json()
            result["final_data_ibkr"] = client.get("/api/data/ibkr").json()

            return result
        finally:
            os.chdir(cwd_before)
            if env_before is None:
                os.environ.pop("BORJA_ACCOUNTS_DB", None)
            else:
                os.environ["BORJA_ACCOUNTS_DB"] = env_before
            if reference_env_before is None:
                os.environ.pop("BORJA_ACCOUNTS_REFERENCE_NOW", None)
            else:
                os.environ["BORJA_ACCOUNTS_REFERENCE_NOW"] = reference_env_before
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
