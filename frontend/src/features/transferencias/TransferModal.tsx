import { useEffect, useState } from 'react';
import { submitTransfer } from '../../api/client';
import type { AccountId } from '../../api/types';
import { useToast } from '../../components/ToastContext';
import { eur, localISODate } from '../../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TransferModal({ open, onClose, onSaved }: Props) {
  const [origen, setOrigen] = useState<AccountId>('openbank');
  const [destino, setDestino] = useState<AccountId>('ibkr');
  const [total, setTotal] = useState('');
  const [fecha, setFecha] = useState(localISODate());
  const showToast = useToast();

  useEffect(() => {
    if (open) {
      setOrigen('openbank');
      setDestino('ibkr');
      setTotal('');
      setFecha(localISODate());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleOrigenChange(v: AccountId) {
    setOrigen(v);
    setDestino(v === 'openbank' ? 'ibkr' : 'openbank');
  }

  async function handleSubmit() {
    const totalNum = parseFloat(total);
    if (!totalNum || totalNum <= 0) {
      showToast('Introduce un importe válido', 'err');
      return;
    }
    if (!fecha) {
      showToast('Introduce una fecha', 'err');
      return;
    }
    if (origen === destino) {
      showToast('Origen y destino deben ser distintos', 'err');
      return;
    }
    try {
      const body = await submitTransfer({ origen, destino, total: totalNum, fecha });
      if (!body.ok) {
        showToast(body.error || 'Error', 'err');
        return;
      }
      onClose();
      showToast(`Transferencia registrada · ${eur(body.saldo_origen)} → ${eur(body.saldo_destino)}`, 'ok');
      onSaved();
    } catch {
      showToast('Error de conexión', 'err');
    }
  }

  return (
    <div className="overlay on">
      <div className="modal">
        <h3>⇄ Transferencia entre cuentas</h3>
        <div className="fg">
          <label>Origen</label>
          <select value={origen} onChange={(e) => handleOrigenChange(e.target.value as AccountId)}>
            <option value="openbank">Openbank</option>
            <option value="ibkr">IBKR</option>
          </select>
        </div>
        <div className="fg">
          <label>Destino</label>
          <select value={destino} onChange={(e) => setDestino(e.target.value as AccountId)}>
            <option value="ibkr">IBKR</option>
            <option value="openbank">Openbank</option>
          </select>
        </div>
        <div className="fg">
          <label>Importe (€)</label>
          <input type="number" placeholder="0.00" step="0.01" min="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div className="fg">
          <label>Fecha</label>
          <input type="date" className="date-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}
