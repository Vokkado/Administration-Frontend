/**
 * Editor de COMPOSICIÓN coloreado (ingredientes / alérgenos / nutrición) reutilizado en
 * el paso 2 del wizard. Cada item viene con su color (🟢🟡🔴) y acciones: confirmar /
 * corregir / quitar / agregar / validar (rojo) / editar valor (nutrición).
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '../../components/ui';
import {
  ValidationService,
  type ValidationDetail,
  type ValidationIngredient,
  type LinkColor,
} from '../../services/validation.service';
import { IngredientVariantsService } from '../../services/ingredient-variants.service';
import { AllergensService } from '../../services/allergens.service';
import { NutritionFactsService } from '../../services/nutrition-facts.service';
import { EditIngredientModal } from './EditIngredientModal';
import './composition.css';

export const COLORS: Record<LinkColor, { bg: string; border: string; dot: string; label: string }> = {
  green: { bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', label: 'Ya existía' },
  yellow: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Revisar' },
  red: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Creado por IA' },
};
type Picked = { id: string; name: string };
type PageResult = { items: Picked[]; total: number };
/** Búsqueda paginada para el picker: (término, offset, límite) → página + total. */
type PickerSearch = (term: string, offset: number, limit: number) => Promise<PageResult>;

// Helpers a nivel módulo = identidad estable (el SearchPicker los usa en deps de useEffect).
const variantSearch: PickerSearch = (term, offset, limit) =>
  IngredientVariantsService.listAdminVariants({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((v: any) => ({ id: v.id, name: v.name })), total: r.total }));
const allergenSearch: PickerSearch = (term, offset, limit) =>
  AllergensService.listAdminAllergens({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((a: any) => ({ id: a.id, name: a.name })), total: r.total }));
const nutritionSearch: PickerSearch = (term, offset, limit) =>
  NutritionFactsService.listAdminNutritionFacts({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((x: any) => ({ id: x.id, name: x.name })), total: r.total }));

export function Dot({ color }: { color: LinkColor }) {
  return <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLORS[color].dot, marginRight: 2 }} />;
}
export function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280' }}>
      {(['green', 'yellow', 'red'] as LinkColor[]).map((c) => (
        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dot color={c} /> {COLORS[c].label}</span>
      ))}
    </div>
  );
}

export function CompositionStep({ productId, detail, busy, setBusy, onChanged }: {
  productId: string; detail: ValidationDetail; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void;
}) {
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  // Ficha de ingrediente abierta en el modal compartido con la página de Ingredientes.
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  return (
    <>
      <Section title={`Ingredientes (${detail.ingredients.length})`}
        adder={<AdderButton label="+ Agregar"
          title="Agregar ingrediente"
          placeholder="Buscar variante de ingrediente…"
          search={variantSearch}
          onPick={(p) => run(() => ValidationService.addIngredient(productId, p.id))} />}>
        {detail.ingredients.length === 0 && <Muted>Sin ingredientes vinculados.</Muted>}
        {detail.ingredients.map((ing) => (
          <IngredientRow
            key={ing.variantId}
            productId={productId}
            ing={ing}
            busy={busy}
            setBusy={setBusy}
            onChanged={onChanged}
            onEditIngredient={() => setEditingIngredientId(ing.ingredientId)}
          />
        ))}
      </Section>

      {editingIngredientId && (
        <EditIngredientModal
          ingredientId={editingIngredientId}
          onClose={() => setEditingIngredientId(null)}
          onSaved={onChanged}
        />
      )}

      <Section title={`Alérgenos (${detail.allergens.length})`}
        adder={<AdderButton label="+ Agregar"
          title="Agregar alérgeno"
          placeholder="Buscar alérgeno…"
          search={allergenSearch}
          onPick={(p) => run(() => ValidationService.addAllergen(productId, p.id))} />}>
        {detail.allergens.length === 0 && <Muted>Sin alérgenos.</Muted>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {detail.allergens.map((a) => (
            <span key={a.allergenId} style={chip(a.color)}>
              <Dot color={a.color} /> {a.allergenName}{a.presence === 'MAY_CONTAIN' ? ' (trazas)' : ''}
              <span onClick={() => !busy && run(() => ValidationService.removeAllergen(productId, a.allergenId))} style={xStyle} title="Quitar">✕</span>
            </span>
          ))}
        </div>
      </Section>

      <Section title={`Nutrición (${detail.nutrition.length})`}
        adder={<NutritionAdder productId={productId} busy={busy} setBusy={setBusy} onChanged={onChanged} />}>
        {detail.nutrition.length === 0 && <Muted>Sin valores nutricionales.</Muted>}
        {detail.nutrition.map((n) => (
          <NutritionRow key={n.nutritionFactId} productId={productId} n={n} busy={busy} setBusy={setBusy} onChanged={onChanged} />
        ))}
      </Section>
    </>
  );
}

/** Qué leyó la IA y con qué lo vinculó: el contexto para decidir el reemplazo. */
const TIER_HINTS: Record<string, string> = {
  EXACT: 'Coincidencia exacta con una variante que ya existía',
  AI: 'Variante creada o vinculada por la IA',
  MANUAL: 'Vinculado a mano por un admin',
};

function DetectedSummary({ ing }: { ing: ValidationIngredient }) {
  const c = COLORS[ing.color];
  const tier = ing.matchTier ?? '—';
  return (
    <div className="vp-detected" style={{ background: c.bg, borderColor: c.border }}>
      <span className="vp-detected-label">Detectado por la IA en la etiqueta</span>
      <div className="vp-detected-name"><Dot color={ing.color} /> {ing.variantName}</div>
      <div className="vp-detected-meta">
        Vinculado al ingrediente <strong>{ing.ingredientName}</strong>
        <span style={tierBadge} title={TIER_HINTS[tier] ?? 'Origen del vínculo'}>{tier}</span>
      </div>
      {ing.reason && <p className="vp-detected-reason">{ing.reason}</p>}
    </div>
  );
}

function IngredientRow({ productId, ing, busy, setBusy, onChanged, onEditIngredient }: { productId: string; ing: ValidationIngredient; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void; onEditIngredient: () => void }) {
  const [score, setScore] = useState<number>(ing.score ?? 5);
  const [tox, setTox] = useState<string>(ing.toxicityLevel ?? 'MEDIUM');
  const [correcting, setCorrecting] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  return (
    <div style={{ ...rowBox(ing.color), flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div><Dot color={ing.color} /> <strong>{ing.variantName}</strong>
            <span style={{ color: '#6b7280', fontSize: 13 }}> → </span>
            {/* El ingrediente canónico abre su ficha completa (la misma de la página de Ingredientes). */}
            <button
              type="button"
              className="vp-ingredient-link"
              onClick={onEditIngredient}
              title="Editar ficha del ingrediente"
            >
              {ing.ingredientName} <span aria-hidden>✎</span>
            </button>
            <span style={tierBadge} title={TIER_HINTS[ing.matchTier ?? ''] ?? 'Origen del vínculo'}>
              {ing.matchTier ?? '—'}
            </span>
          </div>
          {ing.color === 'red' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13 }}>Score <input type="number" min={1} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: 54, marginLeft: 6 }} /></label>
              <label style={{ fontSize: 13 }}>Toxicidad
                <select value={tox} onChange={(e) => setTox(e.target.value)} style={{ marginLeft: 6 }}>
                  <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option>
                </select>
              </label>
              {ing.reason && <em style={{ fontSize: 12, color: '#6b7280' }}>{ing.reason}</em>}
              <Button variant="primary" onClick={() => run(() => ValidationService.validateIngredient(ing.ingredientId, { score, toxicityLevel: tox }))} disabled={busy}>Validar ingrediente</Button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {ing.color !== 'green' && <Button variant="primary" onClick={() => run(() => ValidationService.confirmIngredient(productId, ing.variantId))} disabled={busy}>✓ Está bien</Button>}
          <Button variant="neutral" onClick={() => setCorrecting((c) => !c)} disabled={busy}>✎ Corregir</Button>
          <Button variant="danger" onClick={() => run(() => ValidationService.removeIngredient(productId, ing.variantId))} disabled={busy}>✕ Quitar</Button>
        </div>
      </div>
      {correcting && (
        <Modal show title="Corregir ingrediente" onClose={() => setCorrecting(false)} maxWidth="560px">
          <div className="vp-picker-modal">
            <DetectedSummary ing={ing} />
            <p className="vp-field-label">Elegí la variante correcta</p>
            <SearchPicker
              plain
              placeholder="Buscar la variante correcta…"
              search={variantSearch}
              onCancel={() => setCorrecting(false)}
              onSelect={(p) => run(async () => { await ValidationService.reassignIngredient(productId, ing.variantId, p.id); setCorrecting(false); })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function NutritionRow({ productId, n, busy, setBusy, onChanged }: { productId: string; n: ValidationDetail['nutrition'][number]; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(n.value != null ? String(n.value) : '');
  const [unit, setUnit] = useState<string>(n.unit ?? '');
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  return (
    <div style={{ ...rowBox(n.color), justifyContent: 'space-between' }}>
      <span><Dot color={n.color} /> {n.name}</span>
      {editing ? (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 70 }} />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unidad" style={{ width: 60 }} />
          <Button variant="primary" onClick={() => run(async () => { await ValidationService.upsertNutrition(productId, n.nutritionFactId, Number(value), unit || null); setEditing(false); })} disabled={busy}>OK</Button>
        </span>
      ) : (
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <strong>{n.value ?? '—'} {n.unit ?? ''}</strong>
          <span onClick={() => !busy && setEditing(true)} style={xStyle} title="Editar">✎</span>
          <span onClick={() => !busy && run(() => ValidationService.removeNutrition(productId, n.nutritionFactId))} style={xStyle} title="Quitar">✕</span>
        </span>
      )}
    </div>
  );
}

function NutritionAdder({ productId, busy, setBusy, onChanged }: { productId: string; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [value, setValue] = useState(''); const [unit, setUnit] = useState('');
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  if (picked) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>{picked.name}:</strong>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="valor" style={{ width: 70 }} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unidad" style={{ width: 60 }} />
        <Button variant="primary" onClick={() => run(async () => { await ValidationService.upsertNutrition(productId, picked.id, Number(value), unit || null); setPicked(null); setValue(''); setUnit(''); })} disabled={busy || !value}>Agregar</Button>
        <Button variant="outline" onClick={() => setPicked(null)}>Cancelar</Button>
      </span>
    );
  }
  return (
    <AdderButton label="+ Agregar nutriente"
      title="Agregar valor nutricional"
      placeholder="Buscar nutriente…"
      search={nutritionSearch}
      onPick={(p) => setPicked(p)} />
  );
}

/**
 * Botón de alta que abre el buscador en un modal: inline empujaba la lista hacia abajo
 * y dejaba el desplegable apretado contra el borde de la card.
 */
function AdderButton({ label, title, placeholder, search, onPick }: {
  label: string; title: string; placeholder: string; search: PickerSearch; onPick: (p: Picked) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>{label}</Button>
      {open && (
        <Modal show title={title} onClose={() => setOpen(false)} maxWidth="560px">
          <div className="vp-picker-modal">
            <SearchPicker
              plain
              placeholder={placeholder}
              search={search}
              onCancel={() => setOpen(false)}
              onSelect={(p) => { onPick(p); setOpen(false); }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

const PICKER_PAGE = 25;

/** Resalta dentro del nombre la parte que coincide con lo tipeado. */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="vp-picker-mark">{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}

function SearchPicker({ search, onSelect, onCancel, placeholder, plain = false }: { search: PickerSearch; onSelect: (p: Picked) => void; onCancel: () => void; placeholder: string; plain?: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Picked[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Fila resaltada, para elegir con ↑/↓ + Enter sin sacar las manos del teclado.
  const [active, setActive] = useState(0);
  // Token para descartar respuestas viejas (debounce + scroll concurrentes).
  const reqRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Primera página: al abrir (q vacío trae todo) y en cada cambio de query (debounce 300ms).
  useEffect(() => {
    const term = q.trim();
    const myReq = ++reqRef.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await search(term, 0, PICKER_PAGE);
        if (reqRef.current === myReq) { setResults(r.items); setTotal(r.total); setActive(0); }
      } finally {
        if (reqRef.current === myReq) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  const loadMore = async () => {
    if (loadingMore || loading || results.length >= total) return;
    const myReq = reqRef.current; // mismo query
    setLoadingMore(true);
    try {
      const r = await search(q.trim(), results.length, PICKER_PAGE);
      if (reqRef.current === myReq) {
        setResults((prev) => [...prev, ...r.items]);
        setTotal(r.total);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) loadMore();
  };

  /** Mueve el resaltado y arrastra el scroll para que la fila quede visible. */
  const move = (delta: number) => {
    if (results.length === 0) return;
    const next = Math.min(Math.max(active + delta, 0), results.length - 1);
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    if (next >= results.length - 3) loadMore();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) onSelect(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  const term = q.trim();

  return (
    <div className={`vp-picker ${plain ? 'is-plain' : ''}`}>
      <div className="vp-picker-search">
        <span className="vp-picker-icon" aria-hidden>🔍</span>
        <input
          autoFocus
          className="vp-picker-input"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button type="button" className="vp-picker-clear" onClick={() => setQ('')} aria-label="Limpiar búsqueda">
            ×
          </button>
        )}
      </div>

      <div className="vp-picker-list" ref={listRef} onScroll={onScroll}>
        {loading && <div className="vp-picker-state"><span className="vp-picker-spinner" />Buscando…</div>}
        {!loading && results.map((r, i) => (
          <button
            key={r.id}
            type="button"
            className={`vp-picker-item ${i === active ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(r)}
          >
            <Highlight text={r.name} term={term} />
          </button>
        ))}
        {!loading && results.length === 0 && (
          <div className="vp-picker-state">Sin resultados{term ? ` para “${term}”` : ''}</div>
        )}
        {!loading && loadingMore && <div className="vp-picker-state"><span className="vp-picker-spinner" />Cargando más…</div>}
        {!loading && !loadingMore && results.length > 0 && results.length < total && (
          <div className="vp-picker-more">Scrolleá para ver más ({results.length} de {total})</div>
        )}
      </div>

      <div className="vp-picker-footer">
        <button type="button" className="vp-picker-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── helpers de estilo ────────────────────────────────────────────────────────────
const tierBadge: React.CSSProperties = { marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280', cursor: 'pointer' };
const xStyle: React.CSSProperties = { cursor: 'pointer', color: '#9ca3af', fontSize: 13, marginLeft: 2, userSelect: 'none' };
function rowBox(color: LinkColor): React.CSSProperties {
  const c = COLORS[color];
  return { display: 'flex', alignItems: 'center', gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 };
}
function chip(color: LinkColor): React.CSSProperties {
  const c = COLORS[color];
  return { display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: '4px 12px', fontSize: 14 };
}
function Section({ title, adder, children }: { title: string; adder?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, margin: 0, color: '#374151' }}>{title}</h3>
        {adder}
      </div>
      {children}
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ color: '#9ca3af', fontSize: 14 }}>{children}</div>; }
