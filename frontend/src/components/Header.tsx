import { eur } from '../lib/format';
import type { Patrimonio } from '../api/types';

export function Header({ patrimonio, onOpenTransfer }: { patrimonio: Patrimonio | null; onOpenTransfer: () => void }) {
  return (
    <header className="header">
      <div className="brand">
        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <text x="16" y="22" textAnchor="middle" fontFamily="Outfit,system-ui,sans-serif" fontSize="15" fontWeight="700" fill="#fff">
            C
          </text>
        </svg>
        <h1>Cuentas</h1>
      </div>
      <div className="patrimonio-pill">
        {patrimonio ? (
          <>
            Total <b>{eur(patrimonio.openbank + patrimonio.ibkr)}</b> — OB {eur(patrimonio.openbank)} · IB {eur(patrimonio.ibkr)}
          </>
        ) : (
          '—'
        )}
      </div>
      <div className="spacer" />
      <button className="btn-transfer" onClick={onOpenTransfer}>
        ⇄ Transferencia
      </button>
    </header>
  );
}
