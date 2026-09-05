import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'ok' | 'err';
interface ToastState {
  msg: string;
  type: ToastType;
}

const ToastCtx = createContext<((msg: string, type?: ToastType) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string, type: ToastType = 'ok') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      <div className={`toast ${toast?.type ?? ''} ${toast ? 'on' : ''}`}>{toast?.msg}</div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
