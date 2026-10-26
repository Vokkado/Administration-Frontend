/**
 * Buscador de tags contra el servidor (sin tildes ni mayúsculas), opcionalmente dentro de un grupo.
 * Lo usan el filtro de productos ("Grupo › Tag") y el modal de fusionar.
 */
import { useEffect, useRef, useState } from 'react';
import { TagsService } from '../../../services/tags.service';
import type { AdminTag } from '../../../services/tags.service';

interface TagSearchProps {
  onPick: (tag: AdminTag) => void;
  /** Solo tags de este grupo. */
  tagGroupId?: string;
  /** Tags que no se ofrecen (ya elegidos, o el mismo que se fusiona). */
  excludeIds?: string[];
  placeholder?: string;
  /** Lista en el flujo en vez de flotante (dentro de un modal). */
  inline?: boolean;
  disabled?: boolean;
}

const MAX_RESULTS = 8;
const EXTRA_FOR_EXCLUDED = 10;

export function TagSearch({ onPick, tagGroupId, excludeIds = [], placeholder = 'Buscar tag…', inline, disabled }: TagSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminTag[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Dentro de un grupo se listan aunque no se escriba nada; en todo el catálogo hace falta un término.
  const searchable = query.trim() !== '' || !!tagGroupId;

  useEffect(() => {
    if (!searchable) return;
    const term = query.trim();
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      // Se piden de más para que, al sacar los excluidos, sigan quedando opciones.
      TagsService.listAdminTags({ limit: MAX_RESULTS + EXTRA_FOR_EXCLUDED, offset: 0, search: term || undefined, tagGroupId, sort: 'products' })
        .then((res) => { if (alive) setResults(res.data); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, tagGroupId, searchable]);

  // Cerrar al tocar afuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const excluded = new Set(excludeIds);
  const visible = results.filter((t) => !excluded.has(t.id)).slice(0, MAX_RESULTS);
  const showList = open && searchable;

  return (
    <div className={`tag-search ${inline ? 'inline' : ''}`} ref={boxRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setLoading(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      />
      {showList && (
        <ul className="tag-search-results" role="listbox">
          {visible.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="tag-search-option"
                onClick={() => { onPick(t); setQuery(''); setOpen(false); }}
              >
                <span>
                  {!tagGroupId && <span className="tag-chip-group">{t.tagGroupName} › </span>}
                  {t.name}
                </span>
                <span className="tag-search-option-meta">
                  {t.productCount} {t.productCount === 1 ? 'producto' : 'productos'}
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="tag-search-empty">{loading ? 'Buscando…' : 'No hay tags que coincidan'}</li>
          )}
        </ul>
      )}
    </div>
  );
}
