import type { AccountId } from '../api/types';

export const TIPOS_NEGATIVOS = new Set(['Gasto', 'Apuestas', 'Inversión', 'Transferencia']);

export const TIPOS_POR_CUENTA: Record<AccountId, string[]> = {
  openbank: ['Gasto', 'Devolución', 'Ingreso', 'Nómina', 'Apuestas', 'Apuestas_r', 'Transferencia'],
  ibkr: ['Gasto', 'Ingreso', 'Inversión', 'Inversión_r'],
};

const BADGE_MAP: Record<string, string> = {
  Gasto: 'gasto',
  Ingreso: 'ingreso',
  Nómina: 'nomina',
  Devolución: 'devolucion',
  Apuestas: 'apuestas',
  Apuestas_r: 'apuestasr',
  Inversión: 'inversion',
  Inversión_r: 'inversionr',
  Transferencia: 'transferencia',
  'Saldo Inicial': 'saldo',
};

export function badgeClass(tipo: string): string {
  return `b-${BADGE_MAP[tipo] || 'saldo'}`;
}

const DISPLAY_TIPO: Record<string, string> = {
  Inversión_r: 'Retorno inv.',
  Apuestas_r: 'Cobro apuesta',
};

export function displayTipo(tipo: string): string {
  return DISPLAY_TIPO[tipo] || tipo;
}
