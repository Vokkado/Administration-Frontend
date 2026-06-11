/**
 * Cola "Validar productos": revisa paso a paso los productos cargados por IA y los EDITA.
 * Colores: 🟢 ya existía · 🟡 capaz mal · 🔴 lo creó la IA.
 * El admin puede: confirmar / corregir / quitar, EDITAR nombre/marca/foto, AGREGAR
 * ingredientes/alérgenos/nutrientes faltantes, editar valores, y aprobar.
 */
import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, LoadingSpinner, EmptyState } from '../../components/ui';
import {
  ValidationService,
  type ValidationQueueItem,
  type ValidationDetail,
  type ValidationIngredient,
  type LinkColor,
} from '../../services/validation.service';
import { IngredientVariantsService } from '../../services/ingredient-variants.service';
import { AllergensService } from '../../services/allergens.service';
import { NutritionFactsService } from '../../services/nutrition-facts.service';

const COLORS: Record<LinkColor, { bg: string; border: string; dot: string; label: string }> = {
  green: { bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', label: 'Ya existía' },
  yellow: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Revisar' },
  red: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Creado por IA' },
};

type Picked = { id: string; name: string };

export function ValidationPage() {
  const [queue, setQueue] = useState<ValidationQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<ValidationDetail | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = queue[index];
  const productId = current?.id;

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const { items, total } = await ValidationService.getQueue(50, 0);
      setQueue(items); setTotal(total); setIndex(0);
    } finally { setLoadingQueue(false); }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try { setDetail(await ValidationService.getDetail(id)); } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { if (productId) fetchDetail(productId); else setDetail(null); }, [productId, fetchDetail]);

  const reloadDetail = () => { if (productId) fetchDetail(productId); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); reloadDetail(); } finally { setBusy(false); } };

  const onApprove = async () => {
    if (!productId) return;
    setBusy(true);
    try { await ValidationService.approve(productId); await fetchQueue(); } finally { setBusy(false); }
  };
  const onSkip = () => setIndex((i) => Math.min(i + 1, queue.length - 1));

  if (loadingQueue) return <AdminLayout title="Validar productos"><LoadingSpinner /></AdminLayout>;
  if (!current || !productId) {
    return (
      <AdminLayout title="Validar productos">
        <EmptyState icon="✅" title="¡Todo validado!" message="No hay productos pendientes de validación." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Validar productos">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#6b7280' }}>Pendientes: <strong>{total}</strong> · revisando {index + 1} de {queue.length}</span>
          <Legend />
        </div>

        {/* Cabecera editable (nombre / marca / foto) */}
        <EditableHeader item={current} busy={busy} setBusy={setBusy} onSaved={fetchQueue} />

        {loadingDetail || !detail ? <LoadingSpinner /> : (
          <>
            {/* Ingredientes */}
            <Section
              title={`Ingredientes (${detail.ingredients.length})`}
              adder={<AdderButton label="+ Agregar ingrediente"
                search={(t) => IngredientVariantsService.listAdminVariants({ limit: 10, offset: 0, search: t }).then((r) => r.data.map((v: any) => ({ id: v.id, name: v.name })))}
                onPick={(p) => run(() => ValidationService.addIngredient(productId, p.id))} />}
            >
              {detail.ingredients.length === 0 && <Muted>Sin ingredientes vinculados.</Muted>}
              {detail.ingredients.map((ing) => (
                <IngredientRow key={ing.variantId} productId={productId} ing={ing} busy={busy} setBusy={setBusy} onChanged={reloadDetail} />
              ))}
            </Section>

            {/* Alérgenos */}
            <Section
              title={`Alérgenos (${detail.allergens.length})`}
              adder={<AdderButton label="+ Agregar alérgeno"
                search={(t) => AllergensService.listAdminAllergens({ limit: 10, offset: 0, search: t }).then((r) => r.data.map((a: any) => ({ id: a.id, name: a.name })))}
                onPick={(p) => run(() => ValidationService.addAllergen(productId, p.id))} />}
            >
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

            {/* Nutrición */}
            <Section
              title={`Nutrición (${detail.nutrition.length})`}
              adder={<NutritionAdder productId={productId} onChanged={reloadDetail} setBusy={setBusy} busy={busy} />}
            >
              {detail.nutrition.length === 0 && <Muted>Sin valores nutricionales.</Muted>}
              {detail.nutrition.map((n) => (
                <NutritionRow key={n.nutritionFactId} productId={productId} n={n} busy={busy} setBusy={setBusy} onChanged={reloadDetail} />
              ))}
            </Section>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, position: 'sticky', bottom: 0, background: '#fff', padding: '12px 0' }}>
              <Button variant="outline" onClick={onSkip} disabled={busy || queue.length <= 1}>Saltar</Button>
              <Button variant="primary" onClick={onApprove} disabled={busy}>Aprobar producto ✓</Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Cabecera editable ──────────────────────────────────────────────────────────
function EditableHeader({ item, busy, setBusy, onSaved }: { item: ValidationQueueItem; busy: boolean; setBusy: (b: boolean) => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? '');
  const [image, setImage] = useState(item.image ?? '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setName(item.name); setBrand(item.brand ?? ''); setImage(item.image ?? ''); setEditing(false); }, [item.id]);

  const save = async () => {
    setBusy(true);
    try { await ValidationService.updateBasics(item.id, { name, brand, image }); setEditing(false); onSaved(); } finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try { setImage(await ValidationService.uploadImage(f)); } catch { /* noop */ } finally { setUploading(false); }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ cursor: editing ? 'pointer' : 'default', position: 'relative' }}>
          {image ? <img src={image} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', background: '#f3f4f6' }} />
                 : <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6' }} />}
          {editing && <><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
            <span style={{ position: 'absolute', bottom: -6, right: -6, fontSize: 11, background: '#111827', color: '#fff', borderRadius: 6, padding: '1px 5px' }}>{uploading ? '…' : '📷'}</span></>}
        </label>
        <div style={{ flex: 1 }}>
          {editing ? (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" style={{ ...inp, fontSize: 16, fontWeight: 600, marginBottom: 6 }} />
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca" style={inp} />
              <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="URL de imagen (o subí una con 📷)" style={{ ...inp, marginTop: 6, fontSize: 12 }} />
            </>
          ) : (
            <>
              <h2 style={{ margin: 0, fontSize: 18 }}>{item.name}</h2>
              <div style={{ color: '#6b7280', fontSize: 14 }}>{item.brand || 'Sin marca'} · {item.barcode || 's/código'}</div>
            </>
          )}
        </div>
        {editing
          ? <div style={{ display: 'flex', gap: 6 }}><Button variant="primary" onClick={save} disabled={busy}>Guardar</Button><Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>Cancelar</Button></div>
          : <Button variant="outline" onClick={() => setEditing(true)}>✎ Editar</Button>}
      </div>
    </div>
  );
}

// ── Fila de ingrediente ─────────────────────────────────────────────────────────
function IngredientRow({ productId, ing, busy, setBusy, onChanged }: { productId: string; ing: ValidationIngredient; busy: boolean; setBusy: (b: boolean) => void; onChanged: () => void }) {
  const [score, setScore] = useState<number>(ing.score ?? 5);
  const [tox, setTox] = useState<string>(ing.toxicityLevel ?? 'MEDIUM');
  const [correcting, setCorrecting] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); onChanged(); } finally { setBusy(false); } };

  return (
    <div style={{ ...rowBox(ing.color), flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div><Dot color={ing.color} /> <strong>{ing.variantName}</strong>
            <span style={{ color: '#6b7280', fontSize: 13 }}> → {ing.ingredientName}</span>
            <span style={tierBadge}>{ing.matchTier ?? '—'}</span>
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
          {ing.color !== 'green' && <Button variant="outline" onClick={() => run(() => ValidationService.confirmIngredient(productId, ing.variantId))} disabled={busy}>✓ Está bien</Button>}
          <Button variant="secondary" onClick={() => setCorrecting((c) => !c)} disabled={busy}>✎ Corregir</Button>
          <Button variant="danger" onClick={() => run(() => ValidationService.removeIngredient(productId, ing.variantId))} disabled={busy}>✕ Quitar</Button>
        </div>
      </div>
      {correcting && (
        <SearchPicker placeholder="Buscar la variante correcta…"
          search={(t) => IngredientVariantsService.listAdminVariants({ limit: 10, offset: 0, search: t }).then((r) => r.data.map((v: any) => ({ id: v.id, name: v.name })))}
          onCancel={() => setCorrecting(false)}
          onSelect={(p) => run(async () => { await ValidationService.reassignIngredient(productId, ing.variantId, p.id); setCorrecting(false); })} />
      )}
    </div>
  );
}

// ── Fila de nutrición (valor editable) ───────────────────────────────────────────
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
      search={(t) => NutritionFactsService.listAdminNutritionFacts({ limit: 10, offset: 0, search: t }).then((r) => r.data.map((x: any) => ({ id: x.id, name: x.name })))}
      onPick={(p) => setPicked(p)} />
  );
}

// ── Picker genérico (buscar + elegir) ────────────────────────────────────────────
function AdderButton({ label, search, onPick }: { label: string; search: (t: string) => Promise<Picked[]>; onPick: (p: Picked) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}>{label}</Button>;
  return <SearchPicker placeholder="Buscar…" search={search} onCancel={() => setOpen(false)} onSelect={(p) => { onPick(p); setOpen(false); }} />;
}

function SearchPicker({ search, onSelect, onCancel, placeholder }: { search: (t: string) => Promise<Picked[]>; onSelect: (p: Picked) => void; onCancel: () => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let active = true; setLoading(true);
    const t = setTimeout(async () => {
      try { const r = await search(term); if (active) setResults(r); } finally { if (active) setLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);
  return (
    <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, minWidth: 280 }}>
      <input autoFocus placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 6 }} />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
        {loading && <div style={{ fontSize: 12, color: '#9ca3af', padding: 4 }}>Buscando…</div>}
        {!loading && results.map((r) => <button key={r.id} onClick={() => onSelect(r)} style={pickerItem}>{r.name}</button>)}
        {!loading && q.trim().length >= 2 && results.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', padding: 4 }}>Sin resultados</div>}
      </div>
      <button onClick={onCancel} style={{ ...pickerItem, color: '#6b7280' }}>Cancelar</button>
    </div>
  );
}

// ── Bits de UI ───────────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const tierBadge: React.CSSProperties = { marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280' };
const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 6 };
const xStyle: React.CSSProperties = { cursor: 'pointer', color: '#9ca3af', fontSize: 13, marginLeft: 2, userSelect: 'none' };
const pickerItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

function rowBox(color: LinkColor): React.CSSProperties {
  const c = COLORS[color];
  return { display: 'flex', alignItems: 'center', gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 };
}
function chip(color: LinkColor): React.CSSProperties {
  const c = COLORS[color];
  return { display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: '4px 12px', fontSize: 14 };
}
function Dot({ color }: { color: LinkColor }) {
  return <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLORS[color].dot, marginRight: 2 }} />;
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
function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280' }}>
      {(['green', 'yellow', 'red'] as LinkColor[]).map((c) => (
        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dot color={c} /> {COLORS[c].label}</span>
      ))}
    </div>
  );
}
