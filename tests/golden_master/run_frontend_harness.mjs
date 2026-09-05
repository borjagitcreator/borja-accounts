// Golden master del dominio financiero que hoy vive en index.html (vanilla JS).
//
// No se copian/transcriben funciones a mano: se extrae el <script> inline
// completo de index.html (regex sobre <script>...(sin src)...</script>) y se
// ejecuta verbatim en un vm context de Node con stubs mínimos de document/
// Plotly/fetch y un reloj fijo (Date parcheada a FIXED_NOW). Si index.html
// cambia, este runner se re-deriva solo — no hay copia manual que pueda
// desincronizarse.
//
// Uso: node run_frontend_harness.mjs > snapshot_frontend.json
// Fijado a Europe/Madrid (TZ real del usuario), NO a UTC: varios cálculos de
// "mes actual" en index.html (monthKey, y la rama kpiType==='mes' de
// periodSlices, usada por IBKR) hacen `new Date(y, m, 1).toISOString().slice(0,7)`.
// Con un TZ de offset positivo esa conversión a UTC cruza medianoche hacia
// atrás y resuelve SIEMPRE al mes anterior — es un bug real de producción,
// no un artefacto de este harness. El equivalente para Openbank vivía en
// computeKPIs y se movió (Bloque 4) a domain/services/kpi.py, donde se
// preserva a propósito igual que aquí. Corregirlo es decisión de un bloque
// posterior explícito, no de aquí. Ver docs/ARCHITECTURE.md.
process.env.TZ = "Europe/Madrid";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const FIXED_NOW = "2026-07-15T12:00:00.000Z"; // "hoy simulado" del golden master — ver docs/ARCHITECTURE.md §7

function extractInlineScript(html) {
  const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const inline = matches.map(m => m[1]).find(body => body.trim().length > 0);
  if (!inline) throw new Error("No se encontró un <script> inline con cuerpo en index.html");
  return inline;
}

class FixedDate extends Date {
  constructor(...args) {
    if (args.length === 0) super(FIXED_NOW);
    else super(...args);
  }
  static now() {
    return new Date(FIXED_NOW).getTime();
  }
}

function buildSandbox() {
  const capturedPlots = {};
  const sandbox = {
    console,
    Plotly: {
      newPlot: (id, traces, layout) => { capturedPlots[id] = { traces, layout }; },
      purge: (id) => { capturedPlots[id] = null; },
    },
    document: {
      addEventListener() {},
      getElementById() { return {}; },
      querySelectorAll() { return []; },
      body: { classList: { add() {}, remove() {} } },
    },
    fetch: () => Promise.reject(new Error("fetch no disponible en el golden master")),
    requestAnimationFrame: (fn) => fn(),
    setTimeout,
    clearTimeout,
    Date: FixedDate,
    __capturedPlots: capturedPlots,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadBackendFixture() {
  const snapshotPath = path.join(HERE, "snapshot_backend.json");
  const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));
  return {
    openbank: snap.initial_data_openbank,
    ibkr: snap.initial_data_ibkr,
    // Ya calculado por el backend (Bloque 4) -- el frontend deja de
    // recalcular esto, solo lo pinta.
    openbankKpisByPeriod: snap.openbank_kpis_by_period,
    openbankApuestasReport3m: snap.openbank_apuestas_report_3m,
    ibkrKpisByPeriod: snap.ibkr_kpis_by_period,
    ibkrCarterasReport3m: snap.ibkr_carteras_report_3m,
  };
}

// Variables `let`/`const` de nivel superior del script (data, account,
// panelFilters, ...) viven en el lexical scope del propio script, no como
// propiedades del objeto global del vm context. Se envuelve en una IIFE que
// termina en un `return {...}` explícito para exponerlas por closure, sin
// tocar una sola línea del cuerpo original.
const EXPOSE = [
  "kpiCardsHtml", "kpiCardsIbkrHtml",
  "apuestasBody", "inversionesBody", "transferenciasBody",
  "gastoAlertHtml", "topMerchantsHtml", "renderMovimientos", "searchedMovs",
  "chartSaldo", "chartMensual", "chartGastos", "chartDonut", "chartCarteras",
  "applyFilter",
];

function wrapForExposure(scriptBody) {
  return `(function() {\n${scriptBody}\n
    return {
      ${EXPOSE.join(",\n      ")},
      setData: (v) => { data = v; },
      setAccount: (v) => { account = v; },
      setPanelFilter: (panel, f) => { panelFilters[panel] = f; },
    };
  })()`;
}

function run() {
  const html = readFileSync(path.join(REPO_ROOT, "index.html"), "utf-8");
  const scriptBody = extractInlineScript(html);
  const fixture = loadBackendFixture();

  const sandbox = buildSandbox();
  const context = vm.createContext(sandbox);
  const api = new vm.Script(wrapForExposure(scriptBody), { filename: "index.html#inline-script" }).runInContext(context);

  const KPI_TYPES = ["mes", "trimestre", "año"];
  const result = {};

  // ── Openbank ──
  api.setData(fixture.openbank);
  api.setAccount("openbank");
  result.openbank_kpis = {};
  for (const t of KPI_TYPES) {
    api.setPanelFilter("kpi", { type: t });
    result.openbank_kpis[t] = api.kpiCardsHtml(fixture.openbankKpisByPeriod[t]);
  }
  result.openbank_gasto_alert = api.gastoAlertHtml();
  result.openbank_top_merchants = api.topMerchantsHtml();
  result.openbank_apuestas_body = api.apuestasBody(fixture.openbankApuestasReport3m);
  result.openbank_movimientos_default = api.renderMovimientos(api.searchedMovs());

  api.setPanelFilter("saldo", { type: "all" });
  api.setPanelFilter("mensual", { type: "all" });
  api.setPanelFilter("gastos", { type: "all" });
  api.chartSaldo(api.applyFilter(fixture.openbank, { type: "all" }));
  api.chartMensual(api.applyFilter(fixture.openbank, { type: "all" }));
  api.chartGastos(api.applyFilter(fixture.openbank, { type: "all" }));
  api.chartDonut(api.applyFilter(fixture.openbank, { type: "all" }));
  result.openbank_charts_all = JSON.parse(JSON.stringify(sandbox.__capturedPlots));
  for (const k of Object.keys(sandbox.__capturedPlots)) delete sandbox.__capturedPlots[k];

  // ── IBKR ──
  api.setData(fixture.ibkr);
  api.setAccount("ibkr");
  result.ibkr_kpis = {};
  for (const t of KPI_TYPES) {
    api.setPanelFilter("kpi", { type: t });
    result.ibkr_kpis[t] = api.kpiCardsIbkrHtml(fixture.ibkrKpisByPeriod[t]);
  }
  result.ibkr_inversiones_body = api.inversionesBody(fixture.ibkrCarterasReport3m);
  result.ibkr_transferencias_body = api.transferenciasBody(fixture.ibkr);
  result.ibkr_movimientos_default = api.renderMovimientos(api.searchedMovs());

  api.chartSaldo(api.applyFilter(fixture.ibkr, { type: "all" }));
  api.chartCarteras(api.applyFilter(fixture.ibkr, { type: "all" }));
  result.ibkr_charts_all = JSON.parse(JSON.stringify(sandbox.__capturedPlots));

  console.log(JSON.stringify(result, null, 2));
}

run();
