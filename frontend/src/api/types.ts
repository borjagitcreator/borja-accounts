export type AccountId = 'openbank' | 'ibkr';
export type KpiPeriod = 'mes' | 'trimestre' | 'año';

export interface Delta {
  diff: number;
}

export interface AccountKpis {
  saldo: number;
  ingresos: number;
  ingresosDelta: Delta;
  gastos: number;
  gastosDelta: Delta;
  balance: number;
  balanceDelta: Delta;
}

export interface Patrimonio {
  openbank: number;
  ibkr: number;
}

export interface Movement {
  Fecha: string;
  Tipo: string;
  Concepto: string;
  Total: number;
  Saldo: number;
  _idx: number | null;
}

export interface AddMovementRequest {
  fecha: string;
  tipo: string;
  concepto: string;
  total: number;
}

export interface EditMovementRequest {
  idx: number;
  tipo: string;
  concepto: string;
  total: number;
}

export interface MutationResult {
  ok: boolean;
  saldo: number;
  error?: string;
}

export interface DeleteResult {
  ok: boolean;
  eliminado: Movement;
  saldo: number;
  error?: string;
}
