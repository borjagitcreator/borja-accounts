import { useEffect, useState } from 'react';
import { editMovement } from '../../api/client';
import type { AccountId, Movement } from '../../api/types';
import { TIPOS_POR_CUENTA, displayTipo } from '../../domain/tipos';
import { eur, fd } from '../../lib/format';
import { useToast } from '../../components/ToastContext';
import { candidatesForTipo, rankConcepts } from './autocomplete';
import { ConceptAutocomplete } from './ConceptAutocomplete';

interface Props {
  idx: number | null;
  account: AccountId;
  data: Movement[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditMovementModal({ idx, account, data, onClose, onSaved }: Props) {
  const row = idx != null ? data.find((r) => r._idx === idx) : undefined;
  const [tipo, setTipo] = useState('');
  const [concepto, setConcepto] = useState('');
  const [total, setTotal] = useState('');
  const showToast = useToast();

  useEffect(() => {
    if (row) {
      setTipo(row.Tipo);
      setConcepto(row.Concepto);
      setTotal(Number(row.Total).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?._idx]);

  useEffect(() => {
    if (idx == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [idx, onClose]);

  if (idx == null || !row) return null;

  async function handleSubmit() {
    const trimmedConcepto = concepto.trim();
    if (!trimmedConcepto) {
      showToast('Introduce un concepto', 'err');
      return;
    }
    const totalNum = parseFloat(total);
    if (!totalNum || totalNum <= 0) {
      showToast('Introduce un importe válido', 'err');
      return;
    }
    try {
      const body = await editMovement(account, { idx: idx as number, tipo, concepto: trimmedConcepto, total: totalNum });
      if (!body.ok) {
        showToast(body.error || 'Error al editar', 'err');
        return;
      }
      onClose();
      showToast(`Actualizado · Saldo: ${eur(body.saldo)}`, 'ok');
      onSaved();
    } catch {
      showToast('Error de conexión', 'err');
    }
  }

  return (
    <div className="overlay on">
      <div className="modal">
        <h3>Editar movimiento</h3>
        <div className="fg">
          <label>Fecha</label>
          <input type="text" disabled value={fd(row.Fecha)} style={{ opacity: 0.65, cursor: 'not-allowed' }} readOnly />
        </div>
        <div className="fg">
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_POR_CUENTA[account].map((t) => (
              <option key={t} value={t}>
                {displayTipo(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Concepto</label>
          <ConceptAutocomplete
            value={concepto}
            onChange={setConcepto}
            suggestions={(q) => rankConcepts(candidatesForTipo(data, tipo, idx), q)}
            placeholder="Descripción"
            onEnterWithMeta={handleSubmit}
          />
        </div>
        <div className="fg">
          <label>Total (€)</label>
          <input type="number" placeholder="0.00" step="0.01" min="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
