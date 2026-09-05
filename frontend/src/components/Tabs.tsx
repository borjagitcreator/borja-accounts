import type { AccountId } from '../api/types';
import { AccountMark } from './AccountMark';

export function Tabs({ account, onChange }: { account: AccountId; onChange: (account: AccountId) => void }) {
  return (
    <div className="tabs">
      <button className={`tab ${account === 'openbank' ? 'active' : ''}`} onClick={() => onChange('openbank')}>
        <span className="tab-inner">
          <AccountMark kind="ob" small />
          Openbank
        </span>
      </button>
      <button className={`tab ${account === 'ibkr' ? 'active' : ''}`} onClick={() => onChange('ibkr')}>
        <span className="tab-inner">
          <AccountMark kind="ik" small />
          IBKR
        </span>
      </button>
    </div>
  );
}
