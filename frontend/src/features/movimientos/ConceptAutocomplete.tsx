import { forwardRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { ConceptStat } from './autocomplete';

interface Props {
  value: string;
  onChange: (v: string) => void;
  suggestions: (query: string) => ConceptStat[];
  onPick?: (concepto: string) => void;
  placeholder?: string;
  onEnterWithMeta?: () => void;
  style?: CSSProperties;
}

/** Autocomplete de concepto reutilizado por la búsqueda, el alta y la
 * edición de movimientos -- cada uno decide qué candidatos ofrecer via
 * `suggestions`. El cierre al hacer click fuera se resuelve con onBlur +
 * preventDefault en el mousedown de cada item (evita que el blur dispare
 * antes del click), sin necesitar el listener global de pointerdown que
 * usaba la versión vanilla para lidiar con popups nativos de Firefox. */
export const ConceptAutocomplete = forwardRef<HTMLInputElement, Props>(function ConceptAutocomplete(
  { value, onChange, suggestions, onPick, placeholder, onEnterWithMeta, style },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ConceptStat[]>([]);
  const [active, setActive] = useState(-1);

  function refresh(query: string) {
    const ranked = suggestions(query).slice(0, 10);
    setItems(ranked);
    setActive(ranked.length ? 0 : -1);
    setOpen(true);
  }

  function pick(i: number) {
    const item = items[i];
    if (!item) return;
    onChange(item.concepto);
    setOpen(false);
    onPick?.(item.concepto);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown') {
        refresh(value);
        e.preventDefault();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onEnterWithMeta?.();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (active >= 0) {
        e.preventDefault();
        pick(active);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="ac-wrap" style={style}>
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          refresh(e.target.value);
        }}
        onFocus={() => refresh(value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 0)}
      />
      {open && (
        <div className="ac-drop on">
          {items.length === 0 ? (
            <div className="ac-empty">{value.trim() ? 'Sin coincidencias' : 'Sin historial aún'}</div>
          ) : (
            items.map((s, i) => (
              <div
                key={s.concepto}
                className={`ac-item ${i === active ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
              >
                <span className="ac-name">{s.concepto}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});
