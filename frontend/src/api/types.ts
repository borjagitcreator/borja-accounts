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
