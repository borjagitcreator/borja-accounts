import type { Movement } from '../../api/types';

export interface ConceptStat {
  concepto: string;
  count: number;
  lastFecha: string;
  suggested?: boolean;
}

export function conceptStats(rows: Movement[]): ConceptStat[] {
  const map = new Map<string, ConceptStat>();
  for (const r of rows) {
    if (!r.Concepto || r.Tipo === 'Saldo Inicial') continue;
    let e = map.get(r.Concepto);
    if (!e) {
      e = { concepto: r.Concepto, count: 0, lastFecha: r.Fecha };
      map.set(r.Concepto, e);
    }
    e.count++;
    if (r.Fecha >= e.lastFecha) e.lastFecha = r.Fecha;
  }
  return [...map.values()];
}

export function rankConcepts(stats: ConceptStat[], query: string): ConceptStat[] {
  const q = (query || '').trim().toLowerCase();
  const byFreq = (a: ConceptStat, b: ConceptStat) =>
    b.count - a.count || b.lastFecha.localeCompare(a.lastFecha) || a.concepto.localeCompare(b.concepto, 'es');
  if (!q) return [...stats].sort(byFreq);
  const prefix: ConceptStat[] = [];
  const contains: ConceptStat[] = [];
  for (const s of stats) {
    const low = s.concepto.toLowerCase();
    if (low.startsWith(q)) prefix.push(s);
    else if (low.includes(q)) contains.push(s);
  }
  prefix.sort(byFreq);
  contains.sort(byFreq);
  return [...prefix, ...contains];
}

// Candidatos de concepto para el input de búsqueda (barra de la tabla) --
// se acotan al tipo ya seleccionado en el propio filtro, si lo hay.
export function conceptCandidatesForSearch(data: Movement[], searchTipo: string): ConceptStat[] {
  const rows = searchTipo ? data.filter((r) => r.Tipo === searchTipo) : data;
  return conceptStats(rows);
}

// Candidatos de concepto para el formulario de alta/edición, según el tipo
// de movimiento elegido. Los tipos "_r" (retorno de apuesta/inversión) solo
// sugieren conceptos de posiciones todavía abiertas -- excludeIdx evita que
// una fila en edición se cuente a sí misma como "ya casada".
export function candidatesForTipo(data: Movement[], tipo: string, excludeIdx: number | null): ConceptStat[] {
  if (!tipo) return [];
  if (tipo === 'Apuestas_r') {
    const casadas = new Set(data.filter((r) => r.Tipo === 'Apuestas_r' && r._idx !== excludeIdx).map((r) => r.Concepto));
    const abiertas = new Set(data.filter((r) => r.Tipo === 'Apuestas' && !casadas.has(r.Concepto)).map((r) => r.Concepto));
    return conceptStats(data.filter((r) => r.Tipo === 'Apuestas' && abiertas.has(r.Concepto)));
  }
  if (tipo === 'Inversión_r') {
    const cerradas = new Set(data.filter((r) => r.Tipo === 'Inversión_r' && r._idx !== excludeIdx).map((r) => r.Concepto));
    const abiertas = new Set(data.filter((r) => r.Tipo === 'Inversión' && !cerradas.has(r.Concepto)).map((r) => r.Concepto));
    return conceptStats(data.filter((r) => r.Tipo === 'Inversión' && abiertas.has(r.Concepto)));
  }
  if (tipo === 'Devolución') {
    return conceptStats(data.filter((r) => r.Tipo === 'Gasto'));
  }
  return conceptStats(data.filter((r) => r.Tipo === tipo));
}

export function suggestNextApuesta(data: Movement[]): ConceptStat | null {
  const re = /^(.*?)(\d+)\s*$/;
  const bets = data.filter((r) => r.Tipo === 'Apuestas').map((r) => r.Concepto);
  const byPrefix = new Map<string, { n: number; digits: number }>();
  for (const c of bets) {
    const m = c.match(re);
    if (!m) continue;
    const pref = m[1];
    const n = parseInt(m[2], 10);
    const prev = byPrefix.get(pref);
    if (!prev || n > prev.n) byPrefix.set(pref, { n, digits: m[2].length });
  }
  let best: ConceptStat | null = null;
  let bestCount = -1;
  for (const [pref, info] of byPrefix) {
    const next = pref + String(info.n + 1).padStart(info.digits, '0');
    if (bets.includes(next)) continue;
    const count = bets.filter((c) => c.startsWith(pref)).length;
    if (count > bestCount) {
      best = { concepto: next, count, lastFecha: '', suggested: true };
      bestCount = count;
    }
  }
  return best;
}
