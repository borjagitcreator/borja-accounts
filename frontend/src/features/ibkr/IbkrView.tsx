import { AccountMark } from '../../components/AccountMark';
import { MovimientosSection } from '../movimientos/MovimientosSection';
import { useAccountData } from '../movimientos/useAccountData';

export function IbkrView({ onDataChanged }: { onDataChanged: () => void }) {
  const { data, reload } = useAccountData('ibkr');

  return (
    <>
      <div className="account-hero">
        <AccountMark kind="ik" />
        <div>
          <h2>Tu cartera</h2>
          <p>Capital, carteras y puente con Openbank</p>
        </div>
      </div>

      {data && <MovimientosSection account="ibkr" data={data} reload={reload} onDataChanged={onDataChanged} />}
    </>
  );
}
