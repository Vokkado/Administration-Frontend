/**
 * Wizard de validación paso a paso (un producto):
 *   1. Básico        — foto, nombre, marca, código de barras (editable).
 *   2. Composición   — ingredientes/alérgenos/nutrición coloreados + fotos que cargó el usuario.
 *   3. Más info      — categoría, registro legal, fabricante/origen, alcohol, porción, alertas.
 *   4. Finalizar     — "Completar" (guarda, queda pendiente) / "Completar y validar".
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, LoadingSpinner } from '../../components/ui';
import { ProductSourceImagesSection } from '../products/components/product-modal';
import { ValidationService, type ValidationDetail, type CategoryOption } from '../../services/validation.service';
import { CompositionStep, Legend } from './composition';

const STEPS = ['Básico', 'Composición', 'Más info', 'Finalizar'];
const SOURCES = ['', 'pos', 'eldorado', 'disco', 'tiendainglesa', 'manual'];

type Meta = {
  name: string; brand: string; barcode: string; image: string; categoryId: string;
  registrationName: string; registrationCode: string; legalName: string;
  alcoholGraduation: string; source: string; servingSizeAmount: string; servingSizeUnit: string;
  isUltraProcessed: boolean; isFatAlert: boolean; isSaturatedFatAlert: boolean; isSugarAlert: boolean; isSodiumAlert: boolean;
};

const toMeta = (p: ValidationDetail['product']): Meta => ({
  name: p.name ?? '', brand: p.brand ?? '', barcode: p.barcode ?? '', image: p.image ?? '', categoryId: p.categoryId ?? '',
  registrationName: p.registrationName ?? '', registrationCode: p.registrationCode ?? '', legalName: p.legalName ?? '',
  alcoholGraduation: p.alcoholGraduation != null ? String(p.alcoholGraduation) : '', source: p.source ?? '',
  servingSizeAmount: p.servingSizeAmount != null ? String(p.servingSizeAmount) : '', servingSizeUnit: p.servingSizeUnit ?? '',
  isUltraProcessed: !!p.isUltraProcessed, isFatAlert: !!p.isFatAlert, isSaturatedFatAlert: !!p.isSaturatedFatAlert,
  isSugarAlert: !!p.isSugarAlert, isSodiumAlert: !!p.isSodiumAlert,
});

export function ValidationWizardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ValidationDetail | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDetail = async () => { setDetail(await ValidationService.getDetail(id)); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, cats] = await Promise.all([ValidationService.getDetail(id), ValidationService.getCategories()]);
        setDetail(d); setMeta(toMeta(d.product)); setCategories(cats);
      } finally { setLoading(false); }
    })();
  }, [id]);

  const set = (k: keyof Meta, v: any) => setMeta((m) => (m ? { ...m, [k]: v } : m));

  const saveMeta = async () => {
    if (!meta) return;
    await ValidationService.updateMeta(id, {
      name: meta.name, brand: meta.brand, barcode: meta.barcode, image: meta.image,
      categoryId: meta.categoryId || null, registrationName: meta.registrationName, registrationCode: meta.registrationCode,
      legalName: meta.legalName, alcoholGraduation: meta.alcoholGraduation === '' ? null : Number(meta.alcoholGraduation),
      source: meta.source || null, servingSizeAmount: meta.servingSizeAmount === '' ? null : Number(meta.servingSizeAmount),
      servingSizeUnit: meta.servingSizeUnit, isUltraProcessed: meta.isUltraProcessed, isFatAlert: meta.isFatAlert,
      isSaturatedFatAlert: meta.isSaturatedFatAlert, isSugarAlert: meta.isSugarAlert, isSodiumAlert: meta.isSodiumAlert,
    });
  };

  const goNext = async () => {
    // Al salir de los pasos con campos meta (0 y 2) persistimos.
    if (step === 0 || step === 2) { setBusy(true); try { await saveMeta(); } finally { setBusy(false); } }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onComplete = async (validate: boolean) => {
    setBusy(true);
    try {
      await saveMeta();
      if (validate) await ValidationService.approve(id);
      navigate('/validation');
    } finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { set('image', await ValidationService.uploadImage(f)); } finally { setBusy(false); }
  };

  if (loading || !detail || !meta) return <AdminLayout title="Validar producto"><LoadingSpinner /></AdminLayout>;

  return (
    <AdminLayout title="Validar producto">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate('/validation')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: 8 }}>← Volver a la lista</button>

        <Stepper step={step} onStep={(s) => setStep(s)} />

        {/* PASO 1 — Básico */}
        {step === 0 && (
          <Card>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ cursor: 'pointer', textAlign: 'center' }}>
                {meta.image ? <img src={meta.image} alt="" style={{ width: 96, height: 96, borderRadius: 10, objectFit: 'contain', background: '#f3f4f6' }} />
                  : <div style={{ width: 96, height: 96, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Sin foto</div>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
                <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>📷 Cambiar</div>
              </label>
              <div style={{ flex: 1 }}>
                <Field label="Nombre"><input value={meta.name} onChange={(e) => set('name', e.target.value)} style={inp} /></Field>
                <Field label="Marca"><input value={meta.brand} onChange={(e) => set('brand', e.target.value)} style={inp} /></Field>
                <Field label="Código de barras"><input value={meta.barcode} onChange={(e) => set('barcode', e.target.value)} style={{ ...inp, fontFamily: 'monospace' }} /></Field>
                <Field label="o pegá una URL de imagen"><input value={meta.image} onChange={(e) => set('image', e.target.value)} style={inp} placeholder="https://…" /></Field>
              </div>
            </div>
          </Card>
        )}

        {/* PASO 2 — Composición + fotos del usuario */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><Legend /></div>
            <Card><CompositionStep productId={id} detail={detail} busy={busy} setBusy={setBusy} onChanged={loadDetail} /></Card>
            <Card>
              <h3 style={{ fontSize: 15, margin: '0 0 10px', color: '#374151' }}>Fotos cargadas por el usuario</h3>
              <ProductSourceImagesSection productId={id} />
            </Card>
          </>
        )}

        {/* PASO 3 — Más info */}
        {step === 2 && (
          <Card>
            <Field label="Categoría">
              <select value={meta.categoryId} onChange={(e) => set('categoryId', e.target.value)} style={inp}>
                <option value="">— Sin categoría —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Row>
              <Field label="Nombre de registro"><input value={meta.registrationName} onChange={(e) => set('registrationName', e.target.value)} style={inp} /></Field>
              <Field label="Código de registro (RNPA/RNE)"><input value={meta.registrationCode} onChange={(e) => set('registrationCode', e.target.value)} style={inp} /></Field>
            </Row>
            <Field label="Razón social / nombre legal"><input value={meta.legalName} onChange={(e) => set('legalName', e.target.value)} style={inp} /></Field>
            <Row>
              <Field label="Origen del dato">
                <select value={meta.source} onChange={(e) => set('source', e.target.value)} style={inp}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                </select>
              </Field>
              <Field label="Graduación alcohólica (% vol)"><input type="number" value={meta.alcoholGraduation} onChange={(e) => set('alcoholGraduation', e.target.value)} style={inp} /></Field>
            </Row>
            <Row>
              <Field label="Porción (cantidad)"><input type="number" value={meta.servingSizeAmount} onChange={(e) => set('servingSizeAmount', e.target.value)} style={inp} /></Field>
              <Field label="Porción (unidad)"><input value={meta.servingSizeUnit} onChange={(e) => set('servingSizeUnit', e.target.value)} style={inp} placeholder="g / ml" /></Field>
            </Row>
            <Field label="Octógonos / alertas">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Check label="Ultraprocesado" v={meta.isUltraProcessed} on={(v) => set('isUltraProcessed', v)} />
                <Check label="Exceso grasas" v={meta.isFatAlert} on={(v) => set('isFatAlert', v)} />
                <Check label="Exceso grasas sat." v={meta.isSaturatedFatAlert} on={(v) => set('isSaturatedFatAlert', v)} />
                <Check label="Exceso azúcares" v={meta.isSugarAlert} on={(v) => set('isSugarAlert', v)} />
                <Check label="Exceso sodio" v={meta.isSodiumAlert} on={(v) => set('isSodiumAlert', v)} />
              </div>
            </Field>
          </Card>
        )}

        {/* PASO 4 — Finalizar */}
        {step === 3 && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Listo para finalizar</h3>
            <p style={{ color: '#6b7280' }}>
              <strong>Completar</strong>: guarda los cambios pero el producto sigue pendiente en la cola.<br />
              <strong>Completar y validar</strong>: guarda y marca el producto como validado (sale de la cola y pasa a usar las tablas estructuradas).
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button variant="outline" onClick={() => onComplete(false)} disabled={busy}>Completar</Button>
              <Button variant="primary" onClick={() => onComplete(true)} disabled={busy}>Completar y validar ✓</Button>
            </div>
          </Card>
        )}

        {/* Navegación entre pasos */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button variant="outline" onClick={goBack} disabled={busy || step === 0}>← Atrás</Button>
            <Button variant="primary" onClick={goNext} disabled={busy}>Siguiente →</Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── UI ───────────────────────────────────────────────────────────────────────────
function Stepper({ step, onStep }: { step: number; onStep: (s: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 20px' }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
          <button onClick={() => onStep(i)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: i === step ? '#111827' : i < step ? '#10b981' : '#9ca3af', fontWeight: i === step ? 700 : 500,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, background: i === step ? '#111827' : i < step ? '#10b981' : '#e5e7eb', color: i <= step ? '#fff' : '#6b7280',
            }}>{i < step ? '✓' : i + 1}</span>
            {label}
          </button>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#10b981' : '#e5e7eb' }} />}
        </div>
      ))}
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 6 };
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 12 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</label>{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}</label>;
}
