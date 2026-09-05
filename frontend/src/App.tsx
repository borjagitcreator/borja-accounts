import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { ToastProvider } from './components/ToastContext';
import { fetchPatrimonio } from './api/client';
import type { AccountId, Patrimonio } from './api/types';
import { OpenbankView } from './features/openbank/OpenbankView';
import { IbkrView } from './features/ibkr/IbkrView';
import { TransferModal } from './features/transferencias/TransferModal';
import type { AccountViewHandle } from './features/shared/viewHandle';
import './styles/app.css';

function App() {
  const [account, setAccount] = useState<AccountId>('openbank');
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const viewRef = useRef<AccountViewHandle>(null);

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
      <Header patrimonio={patrimonio} onOpenTransfer={() => setTransferModalOpen(true)} />
      <Tabs account={account} onChange={setAccount} />
      <main className="content">
        {account === 'openbank' ? (
          <OpenbankView ref={viewRef} onDataChanged={refreshPatrimonio} />
        ) : (
          <IbkrView ref={viewRef} onDataChanged={refreshPatrimonio} onOpenTransferModal={() => setTransferModalOpen(true)} />
        )}
      </main>
      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSaved={() => viewRef.current?.refreshAll()}
      />
    </ToastProvider>
  );
}

export default App;
