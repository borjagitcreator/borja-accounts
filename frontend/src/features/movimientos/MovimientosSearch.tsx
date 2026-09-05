import type { AccountId, Movement } from '../../api/types';
import { displayTipo, TIPOS_POR_CUENTA } from '../../domain/tipos';
import { conceptCandidatesForSearch, rankConcepts } from './autocomplete';
import { ConceptAutocomplete } from './ConceptAutocomplete';
import { EMPTY_SEARCH, type MovSearch } from './search';

interface Props {
  account: AccountId;
  data: Movement[];
  search: MovSearch;
  onChange: (search: MovSearch) => void;
}

export function MovimientosSearch({ account, data, search, onChange }: Props) {
  return (
    <div className="mov-search">
      <select value={search.tipo} onChange={(e) => onChange({ ...search, tipo: e.target.value })}>
        <option value="">Todos los tipos</option>
        {TIPOS_POR_CUENTA[account].map((t) => (
          <option key={t} value={t}>
            {displayTipo(t)}
          </option>
        ))}
      </select>
      <ConceptAutocomplete
        value={search.concepto}
        onChange={(v) => onChange({ ...search, concepto: v })}
        suggestions={(q) => rankConcepts(conceptCandidatesForSearch(data, search.tipo), q)}
        placeholder="Concepto…"
        style={{ flex: '1 1 130px', minWidth: 110 }}
      />
      <input
        type="date"
        className="date-input"
        title="Filtrar por fecha"
        value={search.fecha}
        onChange={(e) => onChange({ ...search, fecha: e.target.value })}
      />
      <button type="button" className="fbtn" onClick={() => onChange(EMPTY_SEARCH)}>
        Limpiar
      </button>
    </div>
  );
}
