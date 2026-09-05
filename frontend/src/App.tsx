import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { ToastProvider } from './components/ToastContext';
import { fetchPatrimonio } from './api/client';
import type { AccountId, Patrimonio } from './api/types';
import { OpenbankView } from './features/openbank/OpenbankView';
import { IbkrView } from './features/ibkr/IbkrView';
import './styles/app.css';

function App() {
  const [account, setAccount] = useState<AccountId>('openbank');
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);

  const refreshPatrimonio = useCallback(() => {
    fetchPatrimonio().then(setPatrimonio);
  }, []);

  useEffect(() => {
    refreshPatrimonio();
  }, [refreshPatrimonio]);

  useEffect(() => {
    document.body.classList.remove('acc-openbank', 'acc-ibkr');
    document.body.classList.add(account === 'ibkr' ? 'acc-ibkr' : 'acc-openbank');
  }, [account]);

  return (
    <ToastProvider>
      <Header patrimonio={patrimonio} />
      <Tabs account={account} onChange={setAccount} />
      <main className="content">
        {account === 'openbank' ? (
          <OpenbankView onDataChanged={refreshPatrimonio} />
        ) : (
          <IbkrView onDataChanged={refreshPatrimonio} />
        )}
      </main>
    </ToastProvider>
  );
}

export default App;
