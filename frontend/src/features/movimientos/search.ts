import type { Movement } from '../../api/types';

export interface MovSearch {
  tipo: string;
  concepto: string;
  fecha: string;
}

export const EMPTY_SEARCH: MovSearch = { tipo: '', concepto: '', fecha: '' };

export function isSearchActive(search: MovSearch): boolean {
  return !!(search.tipo || search.concepto || search.fecha);
}

export function searchedMovs(rows: Movement[], search: MovSearch): Movement[] {
  let res = rows;
  if (search.tipo) res = res.filter((r) => r.Tipo === search.tipo);
  if (search.concepto) {
    const q = search.concepto.toLowerCase();
    res = res.filter((r) => r.Concepto.toLowerCase().includes(q));
  }
  if (search.fecha) res = res.filter((r) => r.Fecha.slice(0, 10) === search.fecha);
  res = [...res].sort((a, b) => b.Fecha.localeCompare(a.Fecha));
  return isSearchActive(search) ? res.slice(0, 500) : res.slice(0, 20);
}
