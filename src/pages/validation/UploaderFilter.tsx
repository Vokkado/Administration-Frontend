/**
 * Filtro de la cola por quién cargó el producto (mail). Al tocarlo muestra los 5 que más productos
 * cargaron; escribiendo busca por mail o nombre. Sirve para elegir qué validar primero (y a quién le
 * llega el aviso de "producto validado").
 */
import { useEffect, useRef, useState } from 'react';
import { ValidationService, type UploaderSummary } from '../../services/validation.service';

export function UploaderFilter({ value, onChange }: { value: string; onChange: (email: string) => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<UploaderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Busca (debounce corto) cuando está abierto.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      ValidationService.topUploaders(text.trim() || undefined)
        .then((r) => { if (alive) setList(r); })
        .catch(() => { if (alive) setList([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [open, text]);

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (value) {
    return (
      <span className="uf-chip" title="Filtrando por quién lo cargó">
        👤 {value}
        <button type="button" aria-label="Quitar filtro" onClick={() => onChange('')}>✕</button>
      </span>
    );
  }

  return (
    <div className="uf" ref={box}>
      <input
        className="uf-input"
        value={text}
        placeholder="👤 Cargado por (mail)…"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onChange(text.trim()); setOpen(false); setText(''); } }}
        aria-label="Filtrar por quién cargó el producto"
      />
      {open && (
        <div className="uf-menu">
          <div className="uf-head">{text.trim() ? 'Coincidencias' : 'Los que más productos cargaron'}</div>
          {loading && <div className="uf-empty">Buscando…</div>}
          {!loading && list.length === 0 && <div className="uf-empty">Nadie con ese mail.</div>}
          {!loading && list.map((u) => (
            <button
              type="button"
              key={u.userId}
              className="uf-item"
              onClick={() => { onChange(u.email); setOpen(false); setText(''); }}
            >
              <span className="uf-email">{u.email}{u.name ? ` · ${u.name}` : ''}</span>
              <span className="uf-counts">{u.total} cargados · {u.pending} pendientes · {u.validated} validados</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
