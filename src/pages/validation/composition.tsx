/**
 * Editor de COMPOSICIÓN coloreado (ingredientes / alérgenos / nutrición) reutilizado en
 * el paso 2 del wizard. Cada item viene con su color (🟢🟡🔴) y acciones: confirmar /
 * corregir / quitar / agregar / validar (rojo) / editar valor (nutrición).
 */
import { IoSparkles } from 'react-icons/io5';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Button, Modal, AttributeBadge, Tooltip, PositionInput } from '../../components/ui';
import { useGoalsAdminView } from '../../hooks/useGoalsAdminView';
import { useSortableList } from '../../hooks/useSortableList';
import {
  ValidationService,
  type ValidationDetail,
  type ValidationIngredient,
  type ValidationAutoAttribute,
  type ValidationTag,
  type LinkColor,
} from '../../services/validation.service';
import { IngredientVariantsService } from '../../services/ingredient-variants.service';
import { AllergensService } from '../../services/allergens.service';
import { NutritionFactsService } from '../../services/nutrition-facts.service';
import { TagsService, type ApplicableTagGroup, type TagSuggestion } from '../../services/tags.service';
import { EditIngredientModal } from './EditIngredientModal';
import { AiCompositionPanel } from './AiCompositionPanel';
import { VariantEditorModal } from '../products/components/product-modal/VariantEditorModal';
import { IngredientEditorModal } from '../products/components/product-modal/IngredientEditorModal';
import { OriginBadge, originLabel } from '../ingredients/components/OriginBadge';
import type { IngredientVariant } from '../ingredients/types';
import './composition.css';

/** `hint` sigue la regla de color de `ProductValidationService` (backend). */
export const COLORS: Record<LinkColor, { bg: string; border: string; dot: string; label: string; hint: string }> = {
  green: {
    bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', label: 'Ya existía',
    hint: 'Ya existía en la base y el vínculo es confiable: coincidió exacto o ya lo confirmó un admin. No hace falta tocarlo.',
  },
  yellow: {
    bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Revisar',
    hint: 'Se vinculó con algo que ya existía, pero por aproximación o sinónimo (puede estar mal), o el ingrediente ya existía pero nadie lo validó todavía. Revisá que corresponda.',
  },
  red: {
    bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Creado por IA',
    hint: 'No había nada parecido en la base y la IA creó la ficha. Hay que revisarla y validarla.',
  },
};

/**
 * De dónde salió cada vínculo. Los valores salen de `IngredientMatcher` (backend); "AI" lo
 * escribe el linker cuando no hubo match, y "MANUAL" el propio wizard al agregar o corregir.
 * Lo usan tanto el tooltip de la badge como el modal de ayuda.
 */
const TIERS: { tier: string; hint: string }[] = [
  { tier: 'INS', hint: 'Aditivo reconocido por su número INS (ej. E-322). Match seguro.' },
  { tier: 'EXACT', hint: 'El texto de la etiqueta coincide exactamente con una variante que ya existía.' },
  { tier: 'ALIAS', hint: 'Coincidió a través de un sinónimo conocido del diccionario.' },
  { tier: 'EXACT_INGREDIENT', hint: 'Coincidió con el nombre de un ingrediente, no con una variante: se creó la variante.' },
  { tier: 'FUZZY', hint: 'Coincidencia aproximada: el texto se parece al de una variante existente, pero no es igual. Es la que más conviene revisar.' },
  { tier: 'FUZZY_INGREDIENT', hint: 'Coincidencia aproximada con el nombre de un ingrediente (no de una variante): se creó la variante. Conviene revisarla.' },
  { tier: 'AI', hint: 'No coincidió con nada: la IA inventó la ficha y creó ingrediente + variante.' },
  { tier: 'MANUAL', hint: 'Lo vinculó a mano un admin (con + Agregar o ✎ Corregir). Ya cuenta como revisado.' },
];
const TIER_HINTS: Record<string, string> = Object.fromEntries(TIERS.map((t) => [t.tier, t.hint]));
const NO_TIER_HINT = 'No hay registro de cómo se hizo este vínculo (por ejemplo, se cargó antes de que se guardara este dato).';

const TRAZAS_HINT = 'La etiqueta dice "puede contener": no es un ingrediente, sino un posible rastro por contaminación cruzada en la fábrica.';
const AI_TAG_HINT = 'No había nada parecido en la base, así que la IA creó el ingrediente y estimó su puntaje y toxicidad. Al validarlo, la ficha queda aprobada para todos los productos que la usen.';
const UNVALIDATED_TAG_HINT = 'Este ingrediente ya existía en el catálogo (no lo creó la IA), pero nadie revisó todavía su puntaje y toxicidad. Al validarlo, la ficha queda aprobada para todos los productos que la usen.';
/** `extra`: lo que se muestra al lado del nombre en el buscador (origen, ingrediente, uso). */
type Picked = { id: string; name: string; extra?: React.ReactNode; /** Nutrientes: su unidad base (g, mg, µg, kcal). */ unit?: string };
type PageResult = { items: Picked[]; total: number };
/** Búsqueda paginada para el picker: (término, offset, límite) → página + total. */
type PickerSearch = (term: string, offset: number, limit: number) => Promise<PageResult>;

// Helpers a nivel módulo = identidad estable (el SearchPicker los usa en deps de useEffect).
const variantSearch: PickerSearch = (term, offset, limit) =>
  IngredientVariantsService.listAdminVariants({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((v) => ({ id: v.id, name: v.name, extra: <VariantPickerInfo v={v} /> })), total: r.total }));
const allergenSearch: PickerSearch = (term, offset, limit) =>
  AllergensService.listAdminAllergens({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((a: any) => ({ id: a.id, name: a.name })), total: r.total }));
const nutritionSearch: PickerSearch = (term, offset, limit) =>
  NutritionFactsService.listAdminNutritionFacts({ limit, offset, search: term || undefined })
    .then((r) => ({ items: r.data.map((x: any) => ({ id: x.id, name: x.name, unit: x.baseUnit })), total: r.total }));

/**
 * Al buscar una variante: a qué ingrediente apunta, si la variante (y el ingrediente, cuando no
 * coincide) la creó la IA o una persona y si está validada, y en cuántos productos está.
 */
function VariantPickerInfo({ v }: { v: IngredientVariant }) {
  const sameName = v.ingredientName && v.ingredientName.trim().toLowerCase() === v.name.trim().toLowerCase();
  // El estado del ingrediente solo se muestra si no es el mismo que el de la variante (evita repetir).
  const ingredientDiffers = v.ingredientInspected !== undefined
    && originLabel(v.ingredientCreatedByAi, v.ingredientInspected).text !== originLabel(v.createdByAi, v.isInspected).text;
  return (
    <span className="vp-picker-item-extra">
      {v.ingredientName && !sameName && <span className="vp-picker-item-parent">→ {v.ingredientName}</span>}
      <OriginBadge createdByAi={v.createdByAi} inspected={v.isInspected} />
      {v.ingredientName && !sameName && v.ingredientInspected !== undefined && ingredientDiffers && (
        <OriginBadge prefix="ingr.:" createdByAi={v.ingredientCreatedByAi} inspected={v.ingredientInspected} />
      )}
      {v.productCount !== undefined && <span className="vp-picker-item-count">{v.productCount} prod.</span>}
    </span>
  );
}

/** `hint` = mostrar al hover qué significa el color (en la leyenda ya lo explica el texto de al lado). */
export function Dot({ color, hint = false }: { color: LinkColor; hint?: boolean }) {
  const dot = <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLORS[color].dot, marginRight: 2 }} />;
  if (!hint) return dot;
  return (
    <Tooltip content={<><strong>{COLORS[color].label}</strong>{COLORS[color].hint}</>} className="vp-dot-hint">
      {dot}
    </Tooltip>
  );
}
export function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280' }}>
      {(['green', 'yellow', 'red'] as LinkColor[]).map((c) => (
        <Tooltip key={c} content={COLORS[c].hint} className="vp-legend-item">
          <Dot color={c} /> {COLORS[c].label}
        </Tooltip>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  const hint = (tier && TIER_HINTS[tier]) || NO_TIER_HINT;
  return (
    <Tooltip content={<><strong>{tier ?? 'Sin origen'}</strong>{hint}</>}>
      <span style={tierBadge} tabIndex={0}>{tier ?? '—'}</span>
    </Tooltip>
  );
}

/** Flecha fina para subir/bajar un ingrediente (hereda el color del botón). */
function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
      <path d={dir === 'up' ? 'M3 7.5 6 4.5l3 3' : 'M3 4.5 6 7.5l3-3'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Orden visual de la tabla nutricional por producto (ids en orden). Vive en memoria: dura
 * mientras no se recargue la página, aunque se cambie de paso o de producto en el wizard.
 */
const nutritionOrderCache = new Map<string, string[]>();

/** `list` ordenada según `order` (ids); lo que no está en `order` va al final en su orden original. */
function applyOrder<T>(list: T[], order: string[], getId: (item: T) => string): T[] {
  if (order.length === 0) return list;
  const rank = new Map(order.map((id, i) => [id, i]));
  return list
    .map((item, i) => ({ item, key: rank.get(getId(item)) ?? order.length + i }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}

/** Copia de `list` con el ítem `from` movido al índice `to`. */
function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Fila de una lista ordenable como la etiqueta (ingredientes, tabla nutricional). Tres formas
 * de moverla, las mismas que en el modal de producto:
 *  - arrastrar desde el asa ⠿ (solo el asa inicia el drag, para no pisar los campos de la fila);
 *  - escribir la posición: es un borrador y se aplica con Enter o al salir (Esc descarta);
 *  - flechas para subir/bajar de a uno.
 * Después de moverse, la fila se resalta y se lleva a la vista.
 */
function SortableRow<T>({ sortable, item, index, count, name, busy, children }: {
  sortable: ReturnType<typeof useSortableList<T>>;
  item: T;
  index: number;
  count: number;
  name: string;
  busy: boolean;
  children: React.ReactNode;
}) {
  const { className, ...row } = sortable.rowProps(item, index);
  return (
    <div {...row} className={`vp-order-row ${className}`}>
      <span
        className={`vp-order-grip${busy ? ' is-disabled' : ''}`}
        title="Arrastrar para cambiar el orden"
        aria-hidden="true"
        {...sortable.gripProps(item)}
      >
        ⠿
      </span>
      <div className="vp-order-handle">
        <button
          type="button"
          className={`vp-order-arrow${index === 0 ? ' is-edge' : ''}`}
          onClick={() => sortable.move(index, index - 1)}
          disabled={busy || index === 0}
          aria-label={`Subir ${name}`}
          title="Subir"
        >
          <Chevron dir="up" />
        </button>
        <PositionInput
          className="vp-order-num"
          value={index + 1}
          max={count}
          name={name}
          disabled={busy}
          onCommit={(pos) => sortable.move(index, pos - 1)}
        />
        <button
          type="button"
          className={`vp-order-arrow${index === count - 1 ? ' is-edge' : ''}`}
          onClick={() => sortable.move(index, index + 1)}
          disabled={busy || index === count - 1}
          aria-label={`Bajar ${name}`}
          title="Bajar"
        >
          <Chevron dir="down" />
        </button>
      </div>
      <div className="vp-order-body">{children}</div>
    </div>
  );
}

/** Filtros de la lista de ingredientes: resaltan lo que hay que mirar y atenúan el resto. */
type IngredientFilter = 'all' | 'review' | 'pending' | 'other-name';
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const INGREDIENT_FILTERS: { key: IngredientFilter; label: string; hint: string; test: (i: ValidationIngredient) => boolean }[] = [
  { key: 'all', label: 'Todos', hint: 'Todos los ingredientes', test: () => true },
  { key: 'review', label: 'Para revisar', hint: 'Los que la IA no está segura de haber vinculado bien o creó ella', test: (i) => i.color !== 'green' },
  { key: 'pending', label: 'Metas sin validar', hint: 'Con atributos de metas o embarazo que puso la IA o el clasificador y nadie validó', test: (i) => (i.autoAttributes ?? []).some((a) => !a.inspected) },
  { key: 'other-name', label: 'Ingrediente con otro nombre', hint: 'La variante de la etiqueta pertenece a un ingrediente que se llama distinto (ej. leche en polvo → Leche)', test: (i) => !sameName(i.variantName, i.ingredientName) },
];

export function CompositionStep({ productId, detail, busy, setBusy, onChanged, nutritionTop, part = 'all' }: {
  productId: string; detail: ValidationDetail; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void;
  /** Va arriba de la tabla nutricional (la porción, que es un dato del producto y la guarda el wizard). */
  nutritionTop?: React.ReactNode;
  /**
   * Qué mostrar: el wizard tiene una pestaña para ingredientes (con la propuesta de la IA), otra
   * para los alérgenos y otra para la tabla.
   */
  part?: 'all' | 'ingredients' | 'allergens' | 'nutrition';
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
  // Nutriente elegido en el buscador y todavía sin valor (fila en edición arriba de la lista).
  const [nutritionDraft, setNutritionDraft] = useState<Picked | null>(null);
  // Lista de ingredientes: qué fila está desplegada y qué filtro resalta (los demás se atenúan).
  const [openIngredientId, setOpenIngredientId] = useState<string | null>(null);
  const [ingredientFilter, setIngredientFilter] = useState<IngredientFilter>('all');

  // Orden de la etiqueta (ingredientes y tabla nutricional). Se muestra al instante
  // (optimista) y se guarda en el backend; si falla, vuelve al orden que vino del servidor.
  // Cómo se mueve (arrastre desde ⠿, posición escrita, flechas): ver `SortableRow`.
  const [ordered, setOrdered] = useState(detail.ingredients);
  useEffect(() => setOrdered(detail.ingredients), [detail.ingredients]);
  const ingredientsSortable = useSortableList({
    items: ordered,
    getId: (i) => i.variantId,
    disabled: busy,
    onMove: (from, to) => {
      const next = reorder(ordered, from, to);
      setOrdered(next);
      run(() => ValidationService.reorderIngredients(productId, next.map((i) => i.variantId)))
        .catch(() => setOrdered(detail.ingredients));
    },
  });

  // Tabla nutricional: el orden es SOLO visual (no se guarda en el backend). Se recuerda por
  // producto mientras no se recargue la página, y se aplica sobre lo que venga del servidor:
  // lo nuevo va al final y lo quitado desaparece.
  const [nutritionOrder, setNutritionOrderState] = useState<string[]>(() => nutritionOrderCache.get(productId) ?? []);
  const setNutritionOrder = (ids: string[]) => {
    nutritionOrderCache.set(productId, ids);
    setNutritionOrderState(ids);
  };
  const nutrition = applyOrder(detail.nutrition, nutritionOrder, (n) => n.nutritionFactId);
  const nutritionSortable = useSortableList({
    items: nutrition,
    getId: (n) => n.nutritionFactId,
    disabled: busy,
    onMove: (from, to) => setNutritionOrder(reorder(nutrition, from, to).map((n) => n.nutritionFactId)),
  });

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
      {(part === 'all' || part === 'ingredients') && (<>
      <AiCompositionPanel productId={productId} detail={detail} busy={busy} setBusy={setBusy} onChanged={onChanged} />
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
        {ordered.length === 0 && <Muted>Sin ingredientes vinculados.</Muted>}
        {ordered.length > 1 && (
          <p className="vp-order-hint">
            Dejalos en el mismo orden que la etiqueta (el primero es el que más hay): arrastrá desde ⠿, o abrí uno y movelo con las flechas o escribiendo su posición.
          </p>
        )}
        {ordered.length > 0 && (
          <div className="vp-li-filters" role="group" aria-label="Resaltar ingredientes">
            {INGREDIENT_FILTERS.map((f) => {
              const n = ordered.filter(f.test).length;
              const on = ingredientFilter === f.key;
              return (
                <button key={f.key} type="button" className={`vp-li-filter${on ? ' is-on' : ''}`} onClick={() => setIngredientFilter(f.key)} aria-pressed={on} title={f.hint}>
                  {f.label} <span className="vp-li-filter-n">{n}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="vp-li-list">
          {ordered.map((ing, idx) => {
            const filter = INGREDIENT_FILTERS.find((f) => f.key === ingredientFilter)!;
            return (
              <IngredientRow
                key={ing.variantId}
                productId={productId}
                ing={ing}
                index={idx}
                count={ordered.length}
                sortable={ingredientsSortable}
                open={openIngredientId === ing.variantId}
                dim={ingredientFilter !== 'all' && !filter.test(ing)}
                busy={busy}
                setBusy={setBusy}
                onChanged={onChanged}
                onToggle={() => setOpenIngredientId((cur) => (cur === ing.variantId ? null : ing.variantId))}
                onPrev={idx > 0 ? () => setOpenIngredientId(ordered[idx - 1].variantId) : undefined}
                onNext={idx < ordered.length - 1 ? () => setOpenIngredientId(ordered[idx + 1].variantId) : undefined}
                onEditVariant={() => setVariantEditor({ id: ing.variantId })}
                onEditIngredient={() => setEditingIngredientId(ing.ingredientId)}
              />
            );
          })}
        </div>
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
      </>)}

      {(part === 'all' || part === 'allergens') && (
        <AllergensSection productId={productId} allergens={detail.allergens} busy={busy} run={run} />
      )}

      {(part === 'all' || part === 'nutrition') && (

      <Section title={`Nutrición (${detail.nutrition.length})`}
        adder={<AdderButton label="+ Agregar nutriente"
          title="Agregar valor nutricional"
          placeholder="Buscar nutriente…"
          search={nutritionSearch}
          onPick={(p) => setNutritionDraft(p)} />}>
        {nutritionTop}
        {/* R52 (APRENDIZAJE.md): "<1 g" no es un número; regla fija para que todos carguen igual. */}
        <p className="vp-order-hint">
          Si la etiqueta dice <strong>"&lt;1 g"</strong> (o "menos de…"): en proteínas, fibra, vitaminas y minerales
          poné <strong>0</strong>; en azúcares, grasas y sodio poné <strong>el número</strong> (1 g). Así no damos
          crédito de más ni escondemos algo malo.
        </p>
        {/* El nutriente recién elegido entra como fila en edición, arriba de la lista: se carga
            mirando la etiqueta, sin un modal que la tape. */}
        {nutritionDraft && (
          <div style={{ ...rowBox('yellow'), justifyContent: 'space-between' }}>
            <span><strong>{nutritionDraft.name}</strong> <span className="vp-nutri-new">nuevo</span></span>
            <NutritionInlineEditor
              key={nutritionDraft.id}
              initialValue=""
              name={nutritionDraft.name}
              currentUnit={null}
              baseUnit={nutritionDraft.unit}
              busy={busy}
              onCancel={() => setNutritionDraft(null)}
              onSave={(value, unit) => run(async () => {
                await ValidationService.upsertNutrition(productId, nutritionDraft.id, value, unit);
                setNutritionDraft(null);
              })}
            />
          </div>
        )}
        {nutrition.length === 0 && !nutritionDraft && <Muted>Sin valores nutricionales.</Muted>}
        {nutrition.length > 1 && (
          <p className="vp-order-hint">
            Ordenalas como en la etiqueta: arrastrá desde ⠿, escribí la posición y Enter, o usá las flechas.
          </p>
        )}
        {nutrition.map((n, idx) => (
          <SortableRow
            key={n.nutritionFactId}
            sortable={nutritionSortable}
            item={n}
            index={idx}
            count={nutrition.length}
            name={n.name}
            busy={busy}
          >
            <NutritionRow productId={productId} n={n} busy={busy} setBusy={setBusy} onChanged={onChanged} />
          </SortableRow>
        ))}
      </Section>
      )}
    </>
  );
}

type AllergenPresence = 'CONTAINS' | 'MAY_CONTAIN';
const PRESENCE: Record<AllergenPresence, { title: string; add: string; empty: string; moveTo: string }> = {
  CONTAINS: { title: 'Contiene', add: '+ Contiene', empty: 'Ninguno.', moveTo: 'Pasar a "puede contener"' },
  MAY_CONTAIN: { title: 'Puede contener (trazas)', add: '+ Puede contener', empty: 'Ninguno.', moveTo: 'Pasar a "contiene"' },
};

/**
 * Alérgenos separados en "Contiene" (es ingrediente) y "Puede contener" (trazas por contaminación
 * cruzada en la fábrica). Cada uno se agrega directo en su grupo, y ⇄ lo pasa al otro (el backend
 * hace upsert de la presencia, así que agregar el mismo alérgeno con la otra presencia lo mueve).
 */
function AllergensSection({ productId, allergens, busy, run }: {
  productId: string; allergens: ValidationDetail['allergens']; busy: boolean; run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const presenceOf = (a: ValidationDetail['allergens'][number]): AllergenPresence => (a.presence === 'MAY_CONTAIN' ? 'MAY_CONTAIN' : 'CONTAINS');
  const groups: AllergenPresence[] = ['CONTAINS', 'MAY_CONTAIN'];
  return (
    <Section title={`Alérgenos (${allergens.length})`}
      adder={
        <div className="vp-section-actions">
          {groups.map((p) => (
            <AdderButton key={p} label={PRESENCE[p].add}
              title={p === 'CONTAINS' ? 'Agregar alérgeno: contiene' : 'Agregar alérgeno: puede contener (trazas)'}
              placeholder="Buscar alérgeno…"
              search={allergenSearch}
              onPick={(picked) => run(() => ValidationService.addAllergen(productId, picked.id, p))} />
          ))}
        </div>
      }>
      {groups.map((p) => {
        const items = allergens.filter((a) => presenceOf(a) === p);
        const other: AllergenPresence = p === 'CONTAINS' ? 'MAY_CONTAIN' : 'CONTAINS';
        return (
          <div key={p} className="vp-allergen-group">
            <div className="vp-allergen-group-title">
              {p === 'MAY_CONTAIN' ? (
                <Tooltip content={TRAZAS_HINT}><span className="vp-hint-text" tabIndex={0}>{PRESENCE[p].title}</span></Tooltip>
              ) : PRESENCE[p].title}
              <span className="vp-allergen-group-count">{items.length}</span>
            </div>
            {items.length === 0 ? <Muted>{PRESENCE[p].empty}</Muted> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {items.map((a) => (
                  <span key={a.allergenId} style={chip(a.color)}>
                    <Dot color={a.color} hint /> {a.allergenName}
                    <button type="button" className="vp-allergen-move" disabled={busy}
                      onClick={() => run(() => ValidationService.addAllergen(productId, a.allergenId, other))}
                      title={PRESENCE[p].moveTo} aria-label={`${PRESENCE[p].moveTo}: ${a.allergenName}`}>⇄</button>
                    <span onClick={() => !busy && run(() => ValidationService.removeAllergen(productId, a.allergenId))} style={xStyle} title="Quitar">✕</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

const MIN_SCORE = 1;
const MAX_SCORE = 10;
/** Un campo vacío o no numérico cae al mínimo en vez de dejar NaN. */
const clampScore = (n: number) => (Number.isFinite(n) ? Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(n))) : MIN_SCORE);

/** Ayuda del paso: qué es cada parte de una fila y qué significa cada origen (ver `TIERS`). */
function CompositionHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal show title="Cómo leer esta lista" onClose={onClose} maxWidth="620px">
      <div className="vp-help">
      <p className="vp-help-row">
        <strong>variante de ingrediente</strong>
        <span> → </span>
        <span className="vp-help-muted">ingrediente</span>
        <span className="vp-help-note">
          Un mismo ingrediente aparece escrito de muchas formas en las etiquetas. Cada una de
          esas formas es una <strong>variante de ingrediente</strong>: el nombre tal como figura
          en el envase, y es lo que queda vinculado al producto. El <strong>ingrediente</strong> es
          la ficha única que agrupa a todas sus variantes y guarda el puntaje, la toxicidad y
          las restricciones.
        </span>
        <span className="vp-help-note">
          Por ejemplo, <strong>cuajo (origen animal)</strong> → <span className="vp-help-muted">enzimas
          coagulantes</span>: la etiqueta dice “cuajo (origen animal)” y eso es una variante del
          ingrediente “enzimas coagulantes”. En la lista se ve la variante; al abrir la fila
          aparecen los dos, cada uno con su ✎ Editar.
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
        <dt>⇄ Cambiar por otra</dt>
        <dd>La IA vinculó la variante equivocada: acá elegís la correcta y reemplaza a la anterior, en la misma posición.</dd>
        <dt>✕ Quitar</dt>
        <dd>Desvincula la variante <strong>de este producto</strong>. La ficha sigue existiendo en el catálogo.</dd>
        <dt>Validar ingrediente</dt>
        <dd>Solo en ingredientes sin validar (al abrir la fila): abre el panel de puntaje y toxicidad. Al validar se guardan los valores que revisaste y la ficha queda aprobada.</dd>
      </dl>

      <h4 className="vp-help-title">De dónde salió cada vínculo</h4>
      <dl className="vp-help-tiers">
        {TIERS.map((t) => (
          <Fragment key={t.tier}>
            <dt>{t.tier}</dt>
            <dd>{t.hint}</dd>
          </Fragment>
        ))}
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
function DetectedSummary({ ing }: { ing: ValidationIngredient }) {
  const c = COLORS[ing.color];
  return (
    <div className="vp-detected" style={{ background: c.bg, borderColor: c.border }}>
      <span className="vp-detected-label">Detectado por la IA en la etiqueta</span>
      <div className="vp-detected-name"><Dot color={ing.color} hint /> {ing.variantName}</div>
      <div className="vp-detected-meta">
        Vinculado al ingrediente <strong>{ing.ingredientName}</strong>
        <TierBadge tier={ing.matchTier} />
      </div>
      {ing.reason && <p className="vp-detected-reason">{ing.reason}</p>}
    </div>
  );
}

/**
 * Atributos de metas y embarazo de la variante (Metas > Sodio, Embarazo > Carne cruda o curada…): las
 * metas los usan cuando el producto no tiene tabla y el embarazo avisa por ellos. Los sin validar
 * (los puso la IA o el clasificador) se marcan; se validan en la pantalla del ingrediente (aprobar el producto no los valida). Para corregirlos: el ✎
 * de la variante.
 */
function IngredientAutoAttributes({ attributes, onEdit }: { attributes?: ValidationAutoAttribute[]; onEdit: () => void }) {
  const { describeAttribute } = useGoalsAdminView();
  if (!attributes || attributes.length === 0) return null;
  const pending = attributes.some((a) => !a.inspected);
  return (
    <div className="vp-signals">
      <span className="vp-signals-label">Metas / embarazo:</span>
      <span className="attr-badge-row">
        {attributes.map((a) => (
          <AttributeBadge
            key={a.attributeId}
            label={a.attributeName}
            size="small"
            tone={a.inspected ? 'default' : 'pending'}
            note={a.inspected ? undefined : 'sin validar'}
            hint={
              <>
                {describeAttribute(a.attributeId)}
                <br />
                {a.inspected ? 'Validado.' : 'Lo puso la IA o el clasificador: falta validarlo en la pantalla del ingrediente.'}
              </>
            }
          />
        ))}
      </span>
      {pending && (
        <button type="button" className="vp-signals-edit" onClick={onEdit} title="Corregir los atributos de la variante">
          Corregir
        </button>
      )}
    </div>
  );
}

/**
 * Ingrediente del producto en la lista compacta: una línea (posición, punto de estado y la variante tal
 * como la dice la etiqueta) que se despliega al tocarla. El desplegable trae lo que antes estaba siempre a
 * la vista: el ingrediente padre y la variante (cada uno con su ficha), las metas, la posición y las
 * acciones. Se reordena arrastrando desde ⠿ (en la fila) o, abierta, con las flechas o escribiendo la posición.
 */
function IngredientRow({ productId, ing, index, count, sortable, open, dim, busy, setBusy, onChanged, onToggle, onPrev, onNext, onEditVariant, onEditIngredient }: {
  productId: string;
  ing: ValidationIngredient;
  index: number;
  count: number;
  sortable: ReturnType<typeof useSortableList<ValidationIngredient>>;
  open: boolean;
  /** Un filtro está activo y esta fila no lo cumple: se atenúa. */
  dim: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onChanged: () => void;
  onToggle: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onEditVariant: () => void;
  onEditIngredient: () => void;
}) {
  const [score, setScore] = useState<number>(ing.score ?? 5);
  const [tox, setTox] = useState<string>(ing.toxicityLevel ?? 'MEDIUM');
  const [correcting, setCorrecting] = useState(false);
  // El panel de puntaje/toxicidad ocupa mucho: arranca cerrado y se abre con el botón.
  const [reviewing, setReviewing] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };

  const { className: dragClass, ...row } = sortable.rowProps(ing, index);
  const attrs = ing.autoAttributes ?? [];
  const pendingAttrs = attrs.some((a) => !a.inspected);
  const tone = ing.color === 'green' ? '' : ` is-${ing.color}`;

  return (
    <div {...row} className={`vp-order-row vp-li${tone}${open ? ' is-open' : ''}${dim ? ' is-dim' : ''} ${dragClass}`}>
      <span
        className={`vp-order-grip${busy ? ' is-disabled' : ''}`}
        title="Arrastrar para cambiar el orden"
        aria-hidden="true"
        {...sortable.gripProps(ing)}
      >
        ⠿
      </span>
      <div className="vp-li-card">
        <button type="button" className="vp-li-head" onClick={onToggle} aria-expanded={open} title={open ? 'Cerrar' : 'Ver ingrediente, metas y acciones'}>
          <span className="vp-li-num">{index + 1}</span>
          <Dot color={ing.color} />
          <span className="vp-li-name">{ing.variantName}</span>
          <span className="vp-li-end">
            {attrs.length > 0 && (
              <Tooltip content={<><strong>Metas / embarazo{pendingAttrs ? ' (falta validar)' : ''}</strong>{attrs.map((a) => a.attributeName).join(', ')}</>}>
                <span className={`vp-li-mk${pendingAttrs ? ' is-pending' : ''}`} aria-label={pendingAttrs ? 'Tiene metas sin validar' : 'Tiene metas'} />
              </Tooltip>
            )}
            <svg className="vp-li-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>

        {open && (
          <div className="vp-li-detail">
            <div className="vp-li-pos" aria-label="Posición en la etiqueta">
              <button type="button" className="vp-li-mv" onClick={() => sortable.move(index, index - 1)} disabled={busy || index === 0} aria-label={`Subir ${ing.variantName}`} title="Subir">
                <Chevron dir="up" />
              </button>
              <PositionInput className="vp-li-posnum" value={index + 1} max={count} name={ing.variantName} disabled={busy} onCommit={(pos) => sortable.move(index, pos - 1)} />
              <button type="button" className="vp-li-mv" onClick={() => sortable.move(index, index + 1)} disabled={busy || index === count - 1} aria-label={`Bajar ${ing.variantName}`} title="Bajar">
                <Chevron dir="down" />
              </button>
            </div>

            <div className="vp-li-body">
              {ing.color !== 'green' && (
                <div className={`vp-li-note is-${ing.color}`}><strong>{COLORS[ing.color].label}.</strong> {COLORS[ing.color].hint}</div>
              )}

              {/* Ingrediente padre → variante: cada uno abre SU ficha. La variante es lo que se vincula al
                  producto (como lo dice la etiqueta); el ingrediente es la entidad canónica que la agrupa. */}
              <div className="vp-li-tree">
                <div className="vp-li-tree-row">
                  <span className="vp-li-tree-k">Ingrediente</span>
                  <span className="vp-li-tree-v">{ing.ingredientName}</span>
                  <button type="button" className="vp-li-tree-edit" onClick={onEditIngredient} title="Editar la ficha del ingrediente (riesgo, puntaje, restricciones)">✎ Editar ingrediente</button>
                </div>
                <div className="vp-li-tree-row is-child">
                  <span className="vp-li-tree-k">Variante</span>
                  <span className="vp-li-tree-v">{ing.variantName}</span>
                  <button type="button" className="vp-li-tree-edit" onClick={onEditVariant} title="Editar la variante (ingrediente base, nombre y atributos)">✎ Editar variante</button>
                </div>
                {/* Qué es cada uno lo explica la "i" del título (CompositionHelp). */}
                <div className="vp-li-tree-foot">Vínculo: <TierBadge tier={ing.matchTier} /></div>
              </div>

              {attrs.length > 0 ? (
                <IngredientAutoAttributes attributes={attrs} onEdit={onEditVariant} />
              ) : (
                <div className="vp-signals"><span className="vp-signals-label">Metas / embarazo:</span><span className="vp-li-none">Ninguna</span></div>
              )}

              {/* Ingrediente sin validar: si lo creó la IA (rojo) o si ya existía y nadie lo revisó (amarillo). */}
              {!ing.ingredientInspected && (
                <button
                  type="button"
                  className={`vp-ai-toggle${ing.color === 'red' ? '' : ' vp-ai-toggle--pending'}${reviewing ? ' is-open' : ''}`}
                  onClick={() => setReviewing((r) => !r)}
                  aria-expanded={reviewing}
                  title={reviewing ? 'Ocultar puntaje y toxicidad' : 'Revisar puntaje y toxicidad para validarlo'}
                >
                  <span className="vp-ai-toggle-tag">{ing.color === 'red' ? 'Creado por la IA' : 'Sin validar'}</span>
                  {reviewing ? 'Ocultar' : 'Validar ingrediente'}
                  <span className="vp-ai-toggle-caret" aria-hidden>▾</span>
                </button>
              )}
              {!ing.ingredientInspected && reviewing && (
                <div className={`vp-ai-panel ${ing.color === 'red' ? '' : 'vp-ai-panel--pending'}`}>
                  <div className="vp-ai-head">
                    {ing.color === 'red' ? (
                      <Tooltip content={AI_TAG_HINT}>
                        <span className="vp-ai-tag" tabIndex={0}>Creado por la IA</span>
                      </Tooltip>
                    ) : (
                      <Tooltip content={UNVALIDATED_TAG_HINT}>
                        <span className="vp-ai-tag vp-ai-tag--pending" tabIndex={0}>Sin validar</span>
                      </Tooltip>
                    )}
                    <span className="vp-ai-hint">
                      {ing.color === 'red'
                        ? 'Revisá el puntaje y la toxicidad antes de validarlo.'
                        : 'Ya existía en el catálogo, pero todavía no está validado: revisá su puntaje y toxicidad.'}
                    </span>
                  </div>

                  {ing.reason && <p className="vp-ai-reason">{ing.reason}</p>}

                  <div className="vp-ai-fields">
                    <div className="vp-field">
                      <span className="vp-field-name">Puntaje</span>
                      <div className="vp-score-input">
                        <button type="button" className="vp-score-step" onClick={() => setScore((s) => clampScore(s - 1))} disabled={busy || score <= MIN_SCORE} aria-label="Bajar puntaje">−</button>
                        <input type="number" min={MIN_SCORE} max={MAX_SCORE} value={score} onChange={(e) => setScore(clampScore(Number(e.target.value)))} disabled={busy} aria-label="Puntaje" />
                        <span className="vp-score-suffix">/10</span>
                        <button type="button" className="vp-score-step" onClick={() => setScore((s) => clampScore(s + 1))} disabled={busy || score >= MAX_SCORE} aria-label="Subir puntaje">+</button>
                      </div>
                    </div>

                    <div className="vp-field">
                      <span className="vp-field-name">Toxicidad</span>
                      <div className="vp-tox-group" role="group" aria-label="Nivel de toxicidad">
                        {TOX_OPTIONS.map((o) => (
                          <button key={o.value} type="button" className={`vp-tox vp-tox-${o.value.toLowerCase()} ${tox === o.value ? 'is-active' : ''}`} onClick={() => setTox(o.value)} disabled={busy}>
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

              <div className="vp-li-actions">
                {/* Un solo primario por pantalla (Validar, arriba): acá todo es secundario. */}
                {ing.color !== 'green' && <Button variant="outline" onClick={() => run(() => ValidationService.confirmIngredient(productId, ing.variantId))} disabled={busy}>✓ Está bien</Button>}
                <button type="button" className="vp-li-action" onClick={() => setCorrecting(true)} disabled={busy}
                  title="Cambiar por otra variante (la IA vinculó la equivocada)" aria-label={`Cambiar ${ing.variantName} por otra variante`}>
                  <span className="vp-li-swap" aria-hidden="true">⇄</span> Cambiar por otra
                </button>
                <button type="button" className="vp-li-action is-danger" onClick={() => run(() => ValidationService.removeIngredient(productId, ing.variantId))} disabled={busy}
                  title="Quitar del producto" aria-label={`Quitar ${ing.variantName}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg> Quitar
                </button>
                <span className="vp-li-nav">
                  <button type="button" className="vp-li-navbtn" onClick={onPrev} disabled={!onPrev} title="Ingrediente anterior" aria-label="Ingrediente anterior">‹</button>
                  <button type="button" className="vp-li-navbtn" onClick={onNext} disabled={!onNext} title="Ingrediente siguiente" aria-label="Ingrediente siguiente">›</button>
                </span>
              </div>
            </div>
          </div>
        )}
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

/**
 * El backend manda el valor como viene de la columna NUMERIC ("0.8000"): pasarlo por Number
 * saca los ceros de relleno (0.8, 10, 1.25). Vacío si no hay valor.
 */
function formatNutritionValue(value: number | string | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

// Unidades que se ofrecen por tipo de nutriente. "cal" va aparte porque así figura en muchas
// etiquetas ("Calorías"); el backend la toma como kcal al puntuar.
const ENERGY_UNITS = ['kcal', 'kJ', 'cal'];
const MASS_UNITS = ['g', 'mg', 'µg'];
/**
 * "gr", "GR", "mcg", "cal"… → la unidad estándar de la lista. Mismos alias que el backend
 * (`UNIT_ALIASES` en nutritionNormalization.ts), que con estos mismos puntúa: "cal" de la
 * etiqueta es kcal ("Calorías").
 */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  mg: 'mg', miligramo: 'mg', miligramos: 'mg',
  'µg': 'µg', ug: 'µg', mcg: 'µg', microgramo: 'µg', microgramos: 'µg',
  kcal: 'kcal', cal: 'kcal', kilocaloria: 'kcal', kilocalorias: 'kcal', 'kilocalorías': 'kcal',
  kj: 'kJ', kilojulio: 'kJ', kilojulios: 'kJ',
};
function standardUnit(unit: string | null | undefined): string | null {
  const u = (unit ?? '').trim().toLowerCase().replace(/\.$/, '');
  return UNIT_ALIASES[u] ?? null;
}

/** El nutriente es energía por su nombre ("Valor energético", "Calorías"): respaldo si no llega la unidad base. */
const isEnergyName = (name: string) => /energ|calor/i.test(name);
/**
 * Unidades que tienen sentido para un nutriente, según su unidad base del catálogo:
 * energía → kcal / kJ / cal; masa → g / mg / µg; otras (UI, %, ml…) → solo esa, porque no se
 * convierten. Sin unidad base, se deduce por el nombre (energía) o por la unidad cargada.
 */
function unitOptions(baseUnit: string | null | undefined, current: string | null | undefined, name: string): string[] {
  const base = standardUnit(baseUnit);
  if (base && ENERGY_UNITS.includes(base)) return ENERGY_UNITS;
  if (base && MASS_UNITS.includes(base)) return MASS_UNITS;
  if (baseUnit?.trim()) return [baseUnit.trim()];
  if (isEnergyName(name)) return ENERGY_UNITS;
  const cur = standardUnit(current);
  return cur && ENERGY_UNITS.includes(cur) ? ENERGY_UNITS : MASS_UNITS;
}

/**
 * La opción de `options` que corresponde a `unit`, o null si no está. Primero tal cual
 * ("cal" → "cal", "ui" → "UI") y si no, por alias ("gr" → "g", "mcg" → "µg").
 */
function matchUnit(options: string[], unit: string | null | undefined): string | null {
  const raw = (unit ?? '').trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === raw);
  if (exact) return exact;
  const std = standardUnit(unit);
  return std && options.includes(std) ? std : null;
}

/** Acepta coma decimal ("0,2"); null si no es un número válido (incluido vacío o negativo). */
function parseAmount(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Valor + unidad de un nutriente, editados DENTRO de la fila (sin modal, para seguir viendo la
 * etiqueta). Las unidades salen de la unidad base del nutriente (ver `unitOptions`): el valor
 * energético ofrece kcal / kJ / cal y nunca g. Si la cargada no corresponde (p. ej. energía en g), arranca en la
 * primera válida y avisa, para revisar también el número. Enter guarda, Esc cancela.
 */
function NutritionInlineEditor({ name, initialValue, currentUnit, baseUnit, busy, onSave, onCancel }: {
  name: string; initialValue: string; currentUnit: string | null; baseUnit: string | null | undefined; busy: boolean;
  onSave: (value: number, unit: string) => void; onCancel: () => void;
}) {
  const units = unitOptions(baseUnit, currentUnit, name);
  const current = matchUnit(units, currentUnit);
  const wrongUnit = !!currentUnit?.trim() && !current;
  const [value, setValue] = useState(initialValue);
  const [unit, setUnit] = useState(current ?? units[0]);
  const amount = parseAmount(value);
  const invalid = value !== '' && amount === null;
  const save = () => { if (amount !== null && !busy) onSave(amount, unit); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };
  return (
    <span className="vp-nutri-inline">
      <input autoFocus className="input vp-nutri-value" inputMode="decimal" value={value} placeholder="0,2"
        onChange={(e) => setValue(e.target.value)} onKeyDown={onKeyDown} aria-invalid={invalid}
        title={invalid ? 'Tiene que ser un número (podés usar coma)' : 'Valor tal cual la tabla. Enter guarda, Esc cancela.'} />
      <select className="input vp-nutri-unit" value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={onKeyDown} aria-label="Unidad">
        {units.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <button type="button" className="vp-nutri-btn is-save" onClick={save} disabled={busy || amount === null} title="Guardar (Enter)" aria-label="Guardar">✓</button>
      <button type="button" className="vp-nutri-btn" onClick={onCancel} title="Cancelar (Esc)" aria-label="Cancelar">✕</button>
      {wrongUnit && (
        <span className="vp-nutri-unit-warn">
          Estaba en «{currentUnit}», que no corresponde a este nutriente: elegí la unidad y revisá el número.
        </span>
      )}
    </span>
  );
}

function NutritionRow({ productId, n, busy, setBusy, onChanged }: { productId: string; n: ValidationDetail['nutrition'][number]; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  // Unidad que no corresponde al nutriente (p. ej. valor energético en g): se marca para corregirla.
  const options = unitOptions(n.baseUnit, n.unit, n.name);
  const wrongUnit = !!n.unit?.trim() && !matchUnit(options, n.unit);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };
  return (
    <div style={{ ...rowBox(n.color), justifyContent: 'space-between' }}>
      <span><Dot color={n.color} hint /> {n.name}</span>
      {editing ? (
        <NutritionInlineEditor
          name={n.name}
          initialValue={formatNutritionValue(n.value)}
          currentUnit={n.unit}
          baseUnit={n.baseUnit}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={(value, unit) => run(async () => { await ValidationService.upsertNutrition(productId, n.nutritionFactId, value, unit); setEditing(false); })}
        />
      ) : (
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className={`vp-nutri-amount${wrongUnit ? ' is-wrong-unit' : ''}`}
            onClick={() => !busy && setEditing(true)}
            title={wrongUnit ? `La unidad no corresponde a este nutriente (va en ${options.join(' / ')}). Tocá para corregirla.` : 'Editar'}
          >
            {wrongUnit && <span aria-hidden>⚠ </span>}
            {formatNutritionValue(n.value) || '—'} {matchUnit(options, n.unit) ?? n.unit ?? ''}
          </button>
          <span onClick={() => !busy && setEditing(true)} style={xStyle} title="Editar">✎</span>
          <span onClick={() => !busy && run(() => ValidationService.removeNutrition(productId, n.nutritionFactId))} style={xStyle} title="Quitar">✕</span>
        </span>
      )}
    </div>
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
            <span className="vp-picker-item-name"><Highlight text={r.name} term={term} /></span>
            {r.extra}
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
            <Dot color={t.color} hint /> {t.tagGroupName}: {t.tagName}
            <span onClick={() => !busy && run(() => ValidationService.removeTag(productId, t.tagId))} style={xStyle} title="Quitar">✕</span>
          </span>
        ))}
      </div>
    </Section>
  );
}

/**
 * "Sugerir con IA" (paso Más info): pide a la IA la categoría y los tags del producto (mira la foto de
 * portada y los datos actuales: ver classificationContext en el backend), sin guardar
 * nada. La categoría se aplica al formulario (se guarda al avanzar, como el resto del paso) y los
 * tags marcados se agregan al producto; los que la IA propone y no existen se crean en su grupo.
 * Los tags se piden para la categoría elegida en pantalla o, si no hay, para la que sugiere la IA.
 * Son dos llamadas a la IA por clic.
 */
export function AiSuggestPanel({ productId, categoryId, linkedTagIds, busy, setBusy, onUseCategory, onCategoryCreated, onChanged }: {
  productId: string; categoryId: string; linkedTagIds: string[]; busy: boolean; setBusy: (b: boolean) => void;
  onUseCategory: (categoryId: string) => void;
  /** Categoría nueva creada desde la propuesta de la IA: el wizard la suma a la lista y la elige. */
  onCategoryCreated: (category: { id: string; name: string; parentId: string | null }) => void;
  onChanged: () => void;
}) {
  type Category = Awaited<ReturnType<typeof ValidationService.suggestCategory>>;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ category: Category; tags: TagSuggestion[] } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const key = (t: TagSuggestion) => `${t.groupId}|${t.tagName}`;

  const suggest = async () => {
    setLoading(true); setError(null);
    try {
      const category = await ValidationService.suggestCategory(productId);
      const forTags = categoryId || category.match?.categoryId;
      const linked = new Set(linkedTagIds);
      const tags = (await TagsService.suggestProductTags(productId, forTags)).filter((t) => !t.tagId || !linked.has(t.tagId));
      setResult({ category, tags });
      setSelected(new Set(tags.map((_, i) => i)));
    } catch {
      setError('La IA no respondió. Probá de nuevo en un rato.');
    } finally { setLoading(false); }
  };

  const addTags = async () => {
    if (!result) return;
    const chosen = result.tags.filter((_, i) => selected.has(i));
    setBusy(true); setError(null);
    try {
      for (const t of chosen) {
        const tagId = t.tagId ?? (await TagsService.createTag({ tagGroupId: t.groupId, name: t.tagName })).id;
        await ValidationService.addTag(productId, tagId);
      }
      const done = new Set(chosen.map(key));
      setResult({ ...result, tags: result.tags.filter((t) => !done.has(key(t))) });
      setSelected(new Set());
      onChanged();
    } catch {
      setError('No se pudieron agregar todos los tags. Revisá la lista y probá de nuevo.');
      onChanged();
    } finally { setBusy(false); }
  };

  const createCategory = async () => {
    const p = result?.category.proposal;
    if (!p) return;
    setBusy(true); setError(null);
    try {
      const created = await ValidationService.createCategory({ name: p.name, parentCategoryId: p.parentId });
      onCategoryCreated({ ...created, parentId: p.parentId });
      setResult((r) => (r ? { ...r, category: { match: { categoryId: created.id, categoryName: created.name, confidence: 'MEDIUM' }, proposal: null } } : r));
    } catch {
      setError('No se pudo crear la categoría (¿ya existe con otro nombre?). Creala desde Categorías.');
    } finally { setBusy(false); }
  };

  const toggle = (i: number) => setSelected((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const cat = result?.category.match;
  const proposal = result?.category.proposal;

  return (
    <div className="vp-sugg">
      <div className="vp-sugg-head">
        <p className="vp-sugg-note">La IA propone categoría y tags mirando la foto de portada y los datos actuales (nombre, marca e ingredientes ya corregidos). Revisalos antes de usarlos.</p>
        <Button variant="outline" onClick={suggest} loading={loading} disabled={busy || loading}><IoSparkles aria-hidden style={{ color: '#2563EB', verticalAlign: '-2px' }} /> Sugerir con IA</Button>
      </div>
      {error && <div className="vp-sugg-note" role="alert" style={{ color: 'var(--color-error)' }}>{error}</div>}
      {result && (
        <>
          <div className="vp-sugg-row">
            <span className="vp-sugg-label">Categoría</span>
            {cat ? (
              <>
                <strong>{cat.categoryName}</strong>
                <span className="vp-sugg-note">confianza {cat.confidence === 'HIGH' ? 'alta' : 'media'}</span>
                {cat.categoryId === categoryId
                  ? <span className="vp-sugg-note">(es la que ya tiene)</span>
                  : <Button variant="primary" onClick={() => onUseCategory(cat.categoryId)} disabled={busy}>Usar</Button>}
              </>
            ) : proposal ? (
              <>
                <span className="vp-sugg-note">Ninguna encaja. Propone una nueva:</span>
                <strong>{proposal.name}</strong>
                {proposal.parentName && <span className="vp-sugg-note">en {proposal.parentName}</span>}
                <Button variant="outline" onClick={createCategory} disabled={busy}>Crear y usar</Button>
              </>
            ) : <span className="vp-sugg-note">No está segura: elegila a mano.</span>}
          </div>
          <div className="vp-sugg-row" style={{ alignItems: 'flex-start' }}>
            <span className="vp-sugg-label">Tags</span>
            {result.tags.length === 0 ? <span className="vp-sugg-note">Nada nuevo para agregar.</span> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div className="vp-sugg-tags">
                  {result.tags.map((t, i) => (
                    <label key={key(t)} className="vp-sugg-tag">
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} disabled={busy} />
                      <span className="vp-sugg-tag-group">{t.groupName}:</span> {t.tagName}
                      {!t.tagId && <span className="vp-sugg-tag-new" title="No existe: se crea en ese grupo al agregarlo">nuevo</span>}
                    </label>
                  ))}
                </div>
                <div>
                  <Button variant="primary" onClick={addTags} disabled={busy || selected.size === 0}>
                    Agregar {selected.size} {selected.size === 1 ? 'tag' : 'tags'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── helpers de estilo ────────────────────────────────────────────────────────────
const tierBadge: React.CSSProperties = { marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280', cursor: 'help' };
const xStyle: React.CSSProperties = { cursor: 'pointer', color: '#9ca3af', fontSize: 13, marginLeft: 2, userSelect: 'none' };
/**
 * El color solo marca lo que hay que mirar: lo que ya está bien (verde) va neutro y el punto
 * de color lo sigue indicando; ámbar y rojo conservan el fondo para que salten a la vista.
 */
const NEUTRAL = { bg: '#fff', border: '#E5E7EB' };
function rowBox(color: LinkColor): React.CSSProperties {
  const c = color === 'green' ? NEUTRAL : COLORS[color];
  return { display: 'flex', alignItems: 'center', gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' };
}
function chip(color: LinkColor): React.CSSProperties {
  const c = color === 'green' ? { bg: '#F3F4F6', border: '#E5E7EB' } : COLORS[color];
  return { display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: '4px 12px', fontSize: 14 };
}
/**
 * Contenedor de una lista (ingredientes, alérgenos, nutrición, tags): el encabezado lleva el
 * título y sus botones de alta, así queda claro a qué lista agrega cada "+ Agregar".
 */
function Section({ title, help, adder, children }: {
  title: string;
  /** Control extra al lado del título (por ejemplo, el botón de ayuda). */
  help?: React.ReactNode;
  adder?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="vp-section">
      <div className="vp-section-head">
        <h3 className="vp-section-title">
          {title}
          {help}
        </h3>
        {adder}
      </div>
      <div className="vp-section-body">{children}</div>
    </section>
  );
}
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ color: '#9ca3af', fontSize: 14 }}>{children}</div>; }
