import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.resolve(HERE, '../../../tests/golden_master');

function readJson(name: string) {
  return JSON.parse(readFileSync(path.join(GOLDEN_DIR, name), 'utf-8'));
}

// Mismo fixture que consume scenario.py / run_frontend_harness.mjs -- las
// claves *_kpis_by_period, etc. son las respuestas ya calculadas por el
// backend (Bloque 4) para el escenario congelado del golden master.
export const backendFixture = readJson('snapshot_backend.json');

// Textos visibles extraídos del HTML vanilla verificado (ver
// extract_frontend_values.py) -- contrato de aceptación del Bloque 5.
export const expectedValues = readJson('snapshot_frontend_values.json').values;
