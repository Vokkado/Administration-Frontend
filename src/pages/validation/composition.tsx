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
  type ValidationTag,
  type LinkColor,
} from '../../services/validation.service';
import { IngredientVariantsService } from '../../services/ingredient-variants.service';
import { AllergensService } from '../../services/allergens.service';
import { NutritionFactsService } from '../../services/nutrition-facts.service';
import { TagsService, type ApplicableTagGroup } from '../../services/tags.service';
import { EditIngredientModal } from './EditIngredientModal';
import { VariantEditorModal } from '../products/components/product-modal/VariantEditorModal';
import { IngredientEditorModal } from '../products/components/product-modal/IngredientEditorModal';
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
  // Fichas abiertas en los modales compartidos con la página de Ingredientes.
  // Son dos entidades distintas: la variante (lo que se vincula al producto) y el
  // ingrediente canónico al que apunta.
  // null = cerrado | { id: null } = crear una variante | { id } = editar esa variante.
  const [variantEditor, setVariantEditor] = useState<{ id: string | null; ingredientId?: string } | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  /** Editar solo refresca; una variante recién creada además se vincula al producto. */
  const handleVariantSaved = (saved: { id: string; name: string }, isNew: boolean) => {
    if (isNew && saved.id) { void run(() => ValidationService.addIngredient(productId, saved.id)); return; }
    onChanged();
  };

  /**
   * Un ingrediente solo no se vincula a nada: lo que se vincula son sus variantes.
   * Por eso al crearlo se encadena el alta de su primera variante, ya con el
   * ingrediente elegido como padre (mismo flujo que el modal de producto).
   */
  const handleIngredientCreated = (ingredient: { id: string }) => {
    setCreatingIngredient(false);
    if (ingredient.id) setVariantEditor({ id: null, ingredientId: ingredient.id });
  };

  return (
    <>
      <Section
        title={`Ingredientes (${detail.ingredients.length})`}
        help={
          <button
            type="button"
            className="vp-help-btn"
            onClick={() => setShowHelp(true)}
            title="Cómo leer esta lista"
            aria-label="Cómo leer esta lista"
          >
            i
          </button>
        }
        adder={
          <div className="vp-section-actions">
            <AdderButton label="+ Agregar"
              title="Agregar una variante que ya existe"
              placeholder="Buscar variante de ingrediente…"
              search={variantSearch}
              onPick={(p) => run(() => ValidationService.addIngredient(productId, p.id))} />
            {/* El ingrediente es la entidad base; la variante es lo que se vincula al
                producto. Por eso van los dos, y crear un ingrediente encadena su variante. */}
            <Button
              variant="outline"
              onClick={() => setCreatingIngredient(true)}
              disabled={busy}
              title="Crear un ingrediente nuevo y su primera variante"
            >
              + Ingrediente
            </Button>
            <Button
              variant="outline"
              onClick={() => setVariantEditor({ id: null })}
              disabled={busy}
              title="Crear una variante nueva de un ingrediente que ya existe"
            >
              + Variante
            </Button>
          </div>
        }>
        {detail.ingredients.length === 0 && <Muted>Sin ingredientes vinculados.</Muted>}
        {detail.ingredients.map((ing) => (
          <IngredientRow
            key={ing.variantId}
            productId={productId}
            ing={ing}
            busy={busy}
            setBusy={setBusy}
            onChanged={onChanged}
            onEditVariant={() => setVariantEditor({ id: ing.variantId })}
            onEditIngredient={() => setEditingIngredientId(ing.ingredientId)}
          />
        ))}
      </Section>

      {variantEditor && (
        <VariantEditorModal
          variantId={variantEditor.id}
          initialIngredientId={variantEditor.ingredientId}
          onClose={() => setVariantEditor(null)}
          onSaved={(saved) => handleVariantSaved(saved, variantEditor.id === null)}
        />
      )}

      {creatingIngredient && (
        <IngredientEditorModal
          onClose={() => setCreatingIngredient(false)}
          onSaved={handleIngredientCreated}
        />
      )}

      {editingIngredientId && (
        <EditIngredientModal
          ingredientId={editingIngredientId}
          onClose={() => setEditingIngredientId(null)}
          onSaved={onChanged}
        />
      )}

      {showHelp && <CompositionHelp onClose={() => setShowHelp(false)} />}

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

const MIN_SCORE = 1;
const MAX_SCORE = 10;
/** Un campo vacío o no numérico cae al mínimo en vez de dejar NaN. */
const clampScore = (n: number) => (Number.isFinite(n) ? Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(n))) : MIN_SCORE);

/**
 * Ayuda del paso: qué es cada parte de una fila y qué significa cada origen.
 * Los valores de `matchTier` salen de `IngredientMatcher` (backend); "AI" lo escribe el
 * linker cuando no hubo match y hubo que crear la ficha.
 */
function CompositionHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal show title="Cómo leer esta lista" onClose={onClose} maxWidth="620px">
      <div className="vp-help">
      <p className="vp-help-row">
        <strong>nombre en negrita</strong>
        <span> → </span>
        <span className="vp-help-muted">nombre en gris</span>
        <span className="vp-help-note">
          El primero es la <strong>variante</strong>: el alias concreto con el que se vinculó
          el producto. El segundo es el <strong>ingrediente</strong> canónico al que esa
          variante pertenece. Clickeá cualquiera de los dos para editarlo.
        </span>
      </p>

      <p className="vp-help-note">
        Si los dos dicen lo mismo, es porque la IA no encontró nada parecido en la base y
        creó el ingrediente y su variante de una, con el mismo nombre.
      </p>

      <h4 className="vp-help-title">Qué hace cada botón</h4>
      <dl className="vp-help-actions">
        <dt>+ Agregar</dt>
        <dd>Vincula al producto una variante que <strong>ya existe</strong> en el catálogo. Es para lo que la IA no detectó, o lo que quitaste sin querer.</dd>
        <dt>+ Ingrediente</dt>
        <dd>Crea un ingrediente que todavía no existe en la base. Como lo que se vincula son las variantes, al guardarlo se encadena el alta de su primera variante.</dd>
        <dt>+ Variante</dt>
        <dd>Crea un alias nuevo de un ingrediente que ya existe, y lo vincula al producto.</dd>
        <dt>✓ Está bien</dt>
        <dd>Confirma que el vínculo que hizo la IA es correcto: la fila pasa a verde. Solo aparece en las que no lo están.</dd>
        <dt>✎ Corregir</dt>
        <dd>La IA vinculó la variante equivocada: acá elegís la correcta y reemplaza a la anterior.</dd>
        <dt>✕ Quitar</dt>
        <dd>Desvincula la variante <strong>de este producto</strong>. La ficha sigue existiendo en el catálogo.</dd>
        <dt>Validar ingrediente</dt>
        <dd>Solo en las filas rojas: guarda el puntaje y la toxicidad que revisaste, y da por aprobada la ficha que inventó la IA.</dd>
      </dl>

      <h4 className="vp-help-title">De dónde salió cada vínculo</h4>
      <dl className="vp-help-tiers">
        <dt>INS</dt>
        <dd>Aditivo reconocido por su número INS (ej. E-322). Match seguro.</dd>
        <dt>EXACT</dt>
        <dd>El texto de la etiqueta coincide exactamente con una variante que ya existía.</dd>
        <dt>ALIAS</dt>
        <dd>Coincidió a través de un sinónimo conocido del diccionario.</dd>
        <dt>EXACT_INGREDIENT</dt>
        <dd>Coincidió con el nombre de un ingrediente, no con una variante: se creó la variante.</dd>
        <dt>FUZZY / FUZZY_INGREDIENT</dt>
        <dd>Coincidencia aproximada por similitud. Es la que más conviene revisar.</dd>
        <dt>AI</dt>
        <dd>No coincidió con nada: la IA inventó la ficha y creó ingrediente + variante.</dd>
      </dl>
      </div>
    </Modal>
  );
}

const TOX_OPTIONS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];

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

function IngredientRow({ productId, ing, busy, setBusy, onChanged, onEditVariant, onEditIngredient }: { productId: string; ing: ValidationIngredient; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void; onEditVariant: () => void; onEditIngredient: () => void }) {
  const [score, setScore] = useState<number>(ing.score ?? 5);
  const [tox, setTox] = useState<string>(ing.toxicityLevel ?? 'MEDIUM');
  const [correcting, setCorrecting] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  return (
    <div style={{ ...rowBox(ing.color), flexDirection: 'column', alignItems: 'stretch' }}>
      {/* Título a la izquierda y acciones a la derecha; el panel de la IA va debajo, a todo el ancho. */}
      <div className="vp-row-head">
        <div className="vp-row-title">
          {/* Cada nombre abre SU ficha: la variante es lo que se vincula al producto,
              el ingrediente es la entidad canónica a la que esa variante apunta. */}
          <div><Dot color={ing.color} />{' '}
            <button
              type="button"
              className="vp-variant-link"
              onClick={onEditVariant}
              title="Editar la variante (ingrediente base, nombre y atributos)"
            >
              {ing.variantName} <span aria-hidden>✎</span>
            </button>
            <span style={{ color: '#6b7280', fontSize: 13 }}> → </span>
            <button
              type="button"
              className="vp-ingredient-link"
              onClick={onEditIngredient}
              title="Editar la ficha del ingrediente (riesgo, puntaje, restricciones)"
            >
              {ing.ingredientName} <span aria-hidden>✎</span>
            </button>
            <span style={tierBadge} title={TIER_HINTS[ing.matchTier ?? ''] ?? 'Origen del vínculo'}>
              {ing.matchTier ?? '—'}
            </span>
          </div>
        </div>
        <div className="vp-row-actions">
          {ing.color !== 'green' && <Button variant="primary" onClick={() => run(() => ValidationService.confirmIngredient(productId, ing.variantId))} disabled={busy}>✓ Está bien</Button>}
          <Button variant="neutral" onClick={() => setCorrecting((c) => !c)} disabled={busy}>✎ Corregir</Button>
          <Button variant="danger" onClick={() => run(() => ValidationService.removeIngredient(productId, ing.variantId))} disabled={busy}>✕ Quitar</Button>
        </div>
      </div>

      {ing.color === 'red' && (
        <div className="vp-ai-panel">
          <div className="vp-ai-head">
            <span className="vp-ai-tag">Creado por la IA</span>
            <span className="vp-ai-hint">Revisá el puntaje y la toxicidad antes de validarlo.</span>
          </div>

          {ing.reason && <p className="vp-ai-reason">{ing.reason}</p>}

          <div className="vp-ai-fields">
            <div className="vp-field">
              <span className="vp-field-name">Puntaje</span>
              <div className="vp-score-input">
                <button
                  type="button"
                  className="vp-score-step"
                  onClick={() => setScore((s) => clampScore(s - 1))}
                  disabled={busy || score <= MIN_SCORE}
                  aria-label="Bajar puntaje"
                >
                  −
                </button>
                <input
                  type="number"
                  min={MIN_SCORE}
                  max={MAX_SCORE}
                  value={score}
                  onChange={(e) => setScore(clampScore(Number(e.target.value)))}
                  disabled={busy}
                  aria-label="Puntaje"
                />
                <span className="vp-score-suffix">/10</span>
                <button
                  type="button"
                  className="vp-score-step"
                  onClick={() => setScore((s) => clampScore(s + 1))}
                  disabled={busy || score >= MAX_SCORE}
                  aria-label="Subir puntaje"
                >
                  +
                </button>
              </div>
            </div>

            <div className="vp-field">
              <span className="vp-field-name">Toxicidad</span>
              <div className="vp-tox-group" role="group" aria-label="Nivel de toxicidad">
                {TOX_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`vp-tox vp-tox-${o.value.toLowerCase()} ${tox === o.value ? 'is-active' : ''}`}
                    onClick={() => setTox(o.value)}
                    disabled={busy}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" onClick={() => run(() => ValidationService.validateIngredient(ing.ingredientId, { score, toxicityLevel: tox }))} disabled={busy}>
              Validar ingrediente
            </Button>
          </div>
        </div>
      )}

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

/**
 * Sección de TAGS del producto (paso "Más info" del wizard, junto a Categoría). A diferencia
 * de ingredientes/alérgenos (listas planas), los tags están agrupados por eje (Grano, Relleno,
 * Certificaciones...) y los grupos APLICABLES dependen de la categoría elegida — por eso este
 * componente recarga la lista de aplicables cada vez que cambia `categoryId`.
 * 🔴 = tag creado por la IA sin revisar (is_inspected=false); 🟢 = ya validado.
 */
export function TagsSection({ productId, categoryId, tags, busy, setBusy, onChanged }: {
  productId: string; categoryId: string; tags: ValidationTag[]; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void;
}) {
  const [groups, setGroups] = useState<ApplicableTagGroup[]>([]);
  useEffect(() => {
    let alive = true;
    TagsService.getApplicableGroups(categoryId || null).then((g) => { if (alive) setGroups(g); });
    return () => { alive = false; };
  }, [categoryId]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };

  const linkedIds = new Set(tags.map((t) => t.tagId));
  const pool = groups.flatMap((g) => g.tags.filter((t) => !linkedIds.has(t.id)).map((t) => ({ id: t.id, name: `${t.name} — ${g.name}` })));
  const tagSearch: PickerSearch = async (term) => {
    const filtered = term ? pool.filter((p) => p.name.toLowerCase().includes(term.toLowerCase())) : pool;
    return { items: filtered.slice(0, PICKER_PAGE), total: filtered.length };
  };

  return (
    <Section title={`Tags (${tags.length})`}
      adder={groups.length > 0 && <AdderButton label="+ Agregar" title="Agregar tag" placeholder="Buscar tag…" search={tagSearch}
        onPick={(p) => run(() => ValidationService.addTag(productId, p.id))} />}>
      {tags.length === 0 && <Muted>{groups.length === 0 ? 'Sin grupos de tags aplicables a esta categoría.' : 'Sin tags.'}</Muted>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map((t) => (
          <span key={t.tagId} style={chip(t.color)}>
            <Dot color={t.color} /> {t.tagGroupName}: {t.tagName}
            <span onClick={() => !busy && run(() => ValidationService.removeTag(productId, t.tagId))} style={xStyle} title="Quitar">✕</span>
          </span>
        ))}
      </div>
    </Section>
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
function Section({ title, help, adder, children }: {
  title: string;
  /** Control extra al lado del título (por ejemplo, el botón de ayuda). */
  help?: React.ReactNode;
  adder?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: 0, color: '#374151' }}>
          {title}
          {help}
        </h3>
        {adder}
      </div>
      {children}
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ color: '#9ca3af', fontSize: 14 }}>{children}</div>; }
