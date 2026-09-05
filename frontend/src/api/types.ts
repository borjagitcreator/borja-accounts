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

export interface IbkrKpis {
  saldo: number;
  aportado: number;
  aportadoDelta: Delta;
  enCarteras: number;
  enCarterasCount: number;
  pnl: number;
  pnlDelta: Delta;
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

export interface OpenBetPosition {
  concepto: string;
  fi: string;
  banca: number;
}

export interface ClosedBetPosition {
  Concepto: string;
  fi: string;
  fr: string;
  banca: number;
  devuelto: number;
  bal: number;
  crec: number;
  balH: number;
  crecH: number;
}

export interface BettingReport {
  openCount: number;
  closedCount: number;
  openPositions: OpenBetPosition[];
  closedPositions: ClosedBetPosition[];
  openTotal: number;
  totalApostado: number;
  totalBets: number;
  totalPnL: number;
  winRate: number;
  wins: number;
}

export interface OpenInvestPosition {
  concepto: string;
  fi: string;
  invertido: number;
}

export interface ClosedInvestPosition {
  Concepto: string;
  fi: string;
  fr: string;
  invertido: number;
  devuelto: number;
  bal: number;
  roi: number;
  balH: number;
  roiH: number;
}

export interface PortfolioReport {
  openCount: number;
  closedCount: number;
  openPositions: OpenInvestPosition[];
  closedPositions: ClosedInvestPosition[];
  openTotal: number;
  totalInv: number;
  totalCarteras: number;
  totalPnL: number;
  totalRoi: number;
}

export interface TransferItem {
  Fecha: string;
  Concepto: string;
  Total: number;
  dir: 'in' | 'out';
  label: string;
}

export interface TransfersReport {
  items: TransferItem[];
  lifetimeRec: number;
  lifetimeSent: number;
  lifetimeNet: number;
  totalCount: number;
}

export interface TransferRequest {
  origen: AccountId;
  destino: AccountId;
  total: number;
  fecha: string;
}

export interface TransferResult {
  ok: boolean;
  saldo_origen: number;
  saldo_destino: number;
  error?: string;
}
