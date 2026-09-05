import { AccountMark } from '../../components/AccountMark';

export function IbkrView() {
  return (
    <div className="account-hero">
      <AccountMark kind="ik" />
      <div>
        <h2>Tu cartera</h2>
        <p>Capital, carteras y puente con Openbank</p>
      </div>
    </div>
  );
}
