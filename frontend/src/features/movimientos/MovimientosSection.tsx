import { useRef, useState } from 'react';
import { deleteLastMovement } from '../../api/client';
import type { AccountId, Movement } from '../../api/types';
import { useToast } from '../../components/ToastContext';
import { eur, fd } from '../../lib/format';
import { AddMovementForm, type AddMovementFormHandle } from './AddMovementForm';
import { EditMovementModal } from './EditMovementModal';
import { MovimientosSearch } from './MovimientosSearch';
import { MovimientosTable } from './MovimientosTable';
import { EMPTY_SEARCH, isSearchActive, searchedMovs, type MovSearch } from './search';

const ACTION_BTN_STYLE = { fontSize: 12, padding: '5px 12px' };

interface Props {
  account: AccountId;
  data: Movement[];
  reload: () => void;
  onDataChanged: () => void;
}

export function MovimientosSection({ account, data, reload, onDataChanged }: Props) {
  const [search, setSearch] = useState<MovSearch>(EMPTY_SEARCH);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const formRef = useRef<AddMovementFormHandle>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();

  const movs = searchedMovs(data, search);
  const countLabel = isSearchActive(search) ? `${movs.length} resultado(s)` : 'Últimos 20';

  function afterMutation() {
    reload();
    onDataChanged();
  }

  function handleRepeatLast() {
    const sorted = [...data].sort((a, b) => a.Fecha.localeCompare(b.Fecha));
    const last = sorted.at(-1);
    if (!last || last.Tipo === 'Saldo Inicial') {
      showToast('No hay movimiento que repetir', 'err');
      return;
    }
    if (formRef.current?.fillFrom(last)) showToast('Formulario rellenado · revisa y guarda', 'ok');
  }

  function handleDuplicate(idx: number) {
    const row = data.find((r) => r._idx === idx);
    if (!row || row.Tipo === 'Saldo Inicial') return;
    if (formRef.current?.fillFrom(row)) {
      showToast('Duplicado en el formulario · revisa y guarda', 'ok');
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function handleDeleteLast() {
    const sorted = [...data].sort((a, b) => a.Fecha.localeCompare(b.Fecha));
    const last = sorted.at(-1);
    if (!last) return;
    if (!window.confirm(`¿Borrar el último movimiento?\n\n${fd(last.Fecha)} · ${last.Tipo} · ${last.Concepto} · ${last.Total}€`)) return;
    try {
      const body = await deleteLastMovement(account);
      if (!body.ok) {
        showToast(body.error || 'Error al borrar', 'err');
        return;
      }
      showToast(`Borrado · Saldo: ${eur(body.saldo)}`, 'ok');
      afterMutation();
    } catch {
      showToast('Error de conexión', 'err');
    }
  }

  return (
    <div className="bottom-grid">
      <div className="section" style={{ overflow: 'visible' }}>
        <div className="section-head">
          <span className="section-title">
            Movimientos · <span className="mov-count">{countLabel}</span>
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost"
              style={ACTION_BTN_STYLE}
              onClick={handleRepeatLast}
              title="Rellena el formulario con el último movimiento"
            >
              Repetir último
            </button>
            <button className="btn btn-danger" style={ACTION_BTN_STYLE} onClick={handleDeleteLast}>
              Borrar último
            </button>
          </div>
        </div>
        <MovimientosSearch account={account} data={data} search={search} onChange={setSearch} />
        <div style={{ overflowX: 'auto' }}>
          <MovimientosTable
            rows={movs}
            onFilterByConcept={(concepto) => setSearch((s) => ({ ...s, concepto }))}
            onDuplicate={handleDuplicate}
            onEdit={setEditingIdx}
          />
        </div>
      </div>

      <div className="section" style={{ overflow: 'visible' }} ref={formSectionRef}>
        <div className="section-head">
          <span className="section-title">Añadir movimiento</span>
        </div>
        <AddMovementForm ref={formRef} account={account} data={data} onSaved={afterMutation} />
      </div>

      <EditMovementModal idx={editingIdx} account={account} data={data} onClose={() => setEditingIdx(null)} onSaved={afterMutation} />
    </div>
  );
}
