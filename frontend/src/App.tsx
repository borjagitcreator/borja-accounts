import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { fetchPatrimonio } from './api/client';
import type { AccountId, Patrimonio } from './api/types';
import { OpenbankView } from './features/openbank/OpenbankView';
import { IbkrView } from './features/ibkr/IbkrView';
import './styles/app.css';

function App() {
  const [account, setAccount] = useState<AccountId>('openbank');
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);

  useEffect(() => {
    fetchPatrimonio().then(setPatrimonio);
  }, []);

  useEffect(() => {
    document.body.classList.remove('acc-openbank', 'acc-ibkr');
    document.body.classList.add(account === 'ibkr' ? 'acc-ibkr' : 'acc-openbank');
  }, [account]);

  return (
    <>
      <Header patrimonio={patrimonio} />
      <Tabs account={account} onChange={setAccount} />
      <main className="content">{account === 'openbank' ? <OpenbankView /> : <IbkrView />}</main>
    </>
  );
}

export default App;
