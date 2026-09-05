import type {
  AccountKpis,
  AddMovementRequest,
  DeleteResult,
  EditMovementRequest,
  KpiPeriod,
  Movement,
  MutationResult,
  Patrimonio,
} from './types';

export async function fetchPatrimonio(): Promise<Patrimonio> {
  const res = await fetch('/api/patrimonio');
  return res.json();
}

export async function fetchAccountKpis(cuenta: string, period: KpiPeriod): Promise<AccountKpis> {
  const res = await fetch(`/api/accounts/${cuenta}/kpis?period=${encodeURIComponent(period)}`);
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
