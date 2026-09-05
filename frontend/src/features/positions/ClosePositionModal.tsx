import { useEffect, useState } from 'react';
import { addMovement } from '../../api/client';
import type { AccountId } from '../../api/types';
import { useToast } from '../../components/ToastContext';
import { eur, localISODate } from '../../lib/format';
import { r2 } from '../../lib/math';

export interface ClosePositionRequest {
  tipo: 'Apuestas' | 'Inversión';
  concepto: string;
  monto: number;
}

interface Props {
  request: ClosePositionRequest | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ClosePositionModal({ request, onClose, onSaved }: Props) {
  const [total, setTotal] = useState('');
  const [fecha, setFecha] = useState(localISODate());
  const showToast = useToast();

  useEffect(() => {
    if (request) {
      setTotal('');
      setFecha(localISODate());
    }
  }, [request]);

  useEffect(() => {
    if (!request) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, onClose]);

  if (!request) return null;

  const isApuesta = request.tipo === 'Apuestas';

  async function handleSubmit() {
    if (!request) return;
    const totalNum = parseFloat(total);
    if (!fecha) {
      showToast('Introduce una fecha de cierre', 'err');
      return;
    }
    if (Number.isNaN(totalNum) || totalNum < 0) {
      showToast('Introduce el importe recibido (0 si es pérdida total)', 'err');
      return;
    }
    const tipoR = isApuesta ? 'Apuestas_r' : 'Inversión_r';
    const acc: AccountId = isApuesta ? 'openbank' : 'ibkr';
    const capital = request.monto || 0;
    const bal = r2(totalNum - capital);
    const roi = capital > 0 ? r2((bal / capital) * 100) : 0;
    try {
      const body = await addMovement(acc, { fecha, tipo: tipoR, concepto: request.concepto, total: totalNum });
      if (!body.ok) {
        showToast(body.error || 'Error al guardar', 'err');
        return;
      }
      onClose();
      if (tipoR === 'Inversión_r') {
        showToast(`Cartera cerrada · ROI ${roi.toFixed(1)}% (${eur(bal)}) · Saldo: ${eur(body.saldo)}`, 'ok');
      } else {
        showToast(`Apuesta cerrada · ${eur(bal)} · Saldo: ${eur(body.saldo)}`, 'ok');
      }
      onSaved();
    } catch {
      showToast('Error de conexión', 'err');
    }
  }

  return (
    <div className="overlay on">
      <div className="modal">
        <h3>{isApuesta ? 'Cerrar apuesta' : 'Cerrar cartera'}</h3>
        <div
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Concepto</span>
            <b style={{ fontSize: 13, textAlign: 'right', maxWidth: 200 }}>{request.concepto}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isApuesta ? 'Banca' : 'Capital'}</span>
            <b style={{ fontSize: 13 }}>{eur(request.monto)}</b>
          </div>
        </div>
        <div className="fg">
          <label>Importe recibido (€)</label>
          <input
            type="number"
            placeholder="0.00 — introduce 0 si es pérdida total"
            step="0.01"
            min="0"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>
        <div className="fg" style={{ marginTop: 10 }}>
          <label>Fecha de cierre</label>
          <input type="date" className="date-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
}
