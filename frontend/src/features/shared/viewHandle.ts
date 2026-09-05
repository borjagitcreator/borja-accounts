// Expuesto por OpenbankView/IbkrView via forwardRef para que App.tsx pueda
// refrescar la vista activa tras una mutación global (transferencia) que
// no se originó dentro de la propia vista -- ver TransferModal.tsx.
export interface AccountViewHandle {
  refreshAll: () => void;
}
