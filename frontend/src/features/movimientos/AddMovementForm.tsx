import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { addMovement } from '../../api/client';
import type { AccountId, Movement } from '../../api/types';
import { TIPOS_POR_CUENTA, displayTipo } from '../../domain/tipos';
import { eur, localISODate } from '../../lib/format';
import { useToast } from '../../components/ToastContext';
import { candidatesForTipo, rankConcepts, suggestNextApuesta } from './autocomplete';
import { ConceptAutocomplete } from './ConceptAutocomplete';

export interface AddMovementFormHandle {
  /** Usado por "Repetir último" / "Duplicar" en la tabla. Devuelve false
   * (con un toast de error) si el tipo del movimiento no existe en esta
   * cuenta -- misma validación que fillFormFromRow en el vanilla. */
  fillFrom: (row: Movement) => boolean;
}

interface Props {
  account: AccountId;
  data: Movement[];
  onSaved: () => void;
}

export const AddMovementForm = forwardRef<AddMovementFormHandle, Props>(function AddMovementForm(
  { account, data, onSaved },
  ref,
) {
  const tipos = TIPOS_POR_CUENTA[account];
  const [fecha, setFecha] = useState(localISODate());
  const [tipo, setTipo] = useState(tipos[0]);
  const [concepto, setConcepto] = useState('');
  const [total, setTotal] = useState('');
  const conceptoRef = useRef<HTMLInputElement>(null);
  const showToast = useToast();

  useEffect(() => {
    setFecha(localISODate());
    setTipo(TIPOS_POR_CUENTA[account][0]);
    setConcepto('');
    setTotal('');
  }, [account]);

  useImperativeHandle(
    ref,
    () => ({
      fillFrom(row) {
        if (!tipos.includes(row.Tipo)) {
          showToast('Ese tipo no está disponible en esta cuenta', 'err');
          return false;
        }
        setTipo(row.Tipo);
        setConcepto(row.Concepto);
        setTotal(Number(row.Total).toFixed(2));
        setFecha(localISODate());
        conceptoRef.current?.focus();
        return true;
      },
    }),
    [tipos, showToast],
  );

  async function handleSubmit() {
    if (!fecha) {
      showToast('Introduce una fecha', 'err');
      return;
    }
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
      const body = await addMovement(account, { fecha, tipo, concepto: trimmedConcepto, total: totalNum });
      if (!body.ok) {
        showToast(body.error || 'Error al guardar', 'err');
        return;
      }
      showToast(`Guardado · Saldo: ${eur(body.saldo)}`, 'ok');
      setFecha(localISODate());
      setTipo(tipos[0]);
      setConcepto('');
      setTotal('');
      onSaved();
    } catch {
      showToast('Error de conexión', 'err');
    }
  }

  function conceptSuggestions(query: string) {
    const ranked = rankConcepts(candidatesForTipo(data, tipo, null), query);
    if (tipo === 'Apuestas' && !query.trim()) {
      const next = suggestNextApuesta(data);
      if (next && !ranked.some((r) => r.concepto === next.concepto)) return [next, ...ranked];
    }
    return ranked;
  }

  return (
    <div className="form-body">
      <div className="fg">
        <label>Fecha</label>
        <input type="date" className="date-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="fg">
        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {displayTipo(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="fg full">
        <label>Concepto</label>
        <ConceptAutocomplete
          ref={conceptoRef}
          value={concepto}
          onChange={setConcepto}
          suggestions={conceptSuggestions}
          placeholder="Empieza a escribir…"
          onEnterWithMeta={handleSubmit}
        />
      </div>
      <div className="fg full">
        <label>Total (€)</label>
        <input type="number" placeholder="0.00" step="0.01" min="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
      </div>
      <div className="fg full">
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
          Guardar
        </button>
      </div>
    </div>
  );
});
