import type { Movement } from '../../api/types';
import { rangeOptions } from './rangeOptions';
import type { RangeFilter } from './RangeFilter';

interface Props {
  data: Movement[];
  filter: RangeFilter;
  onChange: (filter: RangeFilter) => void;
}

// Antes cada panel (saldo/mensual/gastos/carteras/apuestas/inversiones/
// transferencias) tenía su propio filtro y su propio panelFilterBar, con
// defaults distintos (3m para listas de posiciones, all para el resto).
// La limpieza de UI acordada para el Bloque 5 los unifica en un único
// filtro por vista -- por eso apuestas/inversiones/transferencias, que
// antes arrancaban en 3m, ahora arrancan en 'all' como el resto. Es un
// cambio de comportamiento por defecto intencional, no una regresión.
export function RangeFilterBar({ data, filter, onChange }: Props) {
  const options = rangeOptions(data);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((opt) => {
        const active = filter.type === opt.type && (opt.year === undefined || opt.year === filter.year);
        return (
          <button
            key={`${opt.type}-${opt.year ?? ''}`}
            className={`fbtn ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.year !== undefined ? { type: opt.type, year: opt.year } : { type: opt.type })}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
