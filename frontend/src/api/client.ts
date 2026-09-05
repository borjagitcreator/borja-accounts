import type {
  AccountKpis,
  AddMovementRequest,
  BettingReport,
  DeleteResult,
  EditMovementRequest,
  IbkrKpis,
  KpiPeriod,
  Movement,
  MutationResult,
  Patrimonio,
  PortfolioReport,
  TransferRequest,
  TransferResult,
  TransfersReport,
} from './types';
import type { RangeFilter } from '../features/filters/RangeFilter';

async function fetchRangeReport<T>(path: string, filter: RangeFilter): Promise<T> {
  const params = new URLSearchParams({ range: filter.type });
  if (filter.year !== undefined) params.set('year', String(filter.year));
  const res = await fetch(`${path}?${params}`);
  return res.json();
}

export async function fetchPatrimonio(): Promise<Patrimonio> {
  const res = await fetch('/api/patrimonio');
  return res.json();
}

export async function fetchAccountKpis(cuenta: string, period: KpiPeriod): Promise<AccountKpis> {
  const res = await fetch(`/api/accounts/${cuenta}/kpis?period=${encodeURIComponent(period)}`);
  return res.json();
}

export async function fetchIbkrKpis(period: KpiPeriod): Promise<IbkrKpis> {
  const res = await fetch(`/api/accounts/ibkr/ibkr-kpis?period=${encodeURIComponent(period)}`);
  return res.json();
}

export async function fetchAccountData(cuenta: string): Promise<Movement[]> {
  const res = await fetch(`/api/data/${cuenta}`);
  return res.json();
}

export async function addMovement(cuenta: string, body: AddMovementRequest): Promise<MutationResult> {
  const res = await fetch(`/api/movimiento/${cuenta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, ...json };
}

export async function editMovement(cuenta: string, body: EditMovementRequest): Promise<MutationResult> {
  const res = await fetch(`/api/movimiento/${cuenta}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, ...json };
}

export async function deleteLastMovement(cuenta: string): Promise<DeleteResult> {
  const res = await fetch(`/api/movimiento/${cuenta}`, { method: 'DELETE' });
  const json = await res.json();
  return { ok: res.ok, ...json };
}

export function fetchApuestas(filter: RangeFilter): Promise<BettingReport> {
  return fetchRangeReport('/api/accounts/openbank/apuestas', filter);
}

export function fetchCarteras(filter: RangeFilter): Promise<PortfolioReport> {
  return fetchRangeReport('/api/accounts/ibkr/carteras', filter);
}

export function fetchTransferencias(filter: RangeFilter): Promise<TransfersReport> {
  return fetchRangeReport('/api/accounts/ibkr/transferencias', filter);
}

export async function submitTransfer(body: TransferRequest): Promise<TransferResult> {
  const res = await fetch('/api/transferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, ...json };
}
