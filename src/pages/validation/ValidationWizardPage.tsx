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
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { ProductSourceImagesSection, ProductCompaniesSection } from '../products/components/product-modal';
import { ValidationService, type ValidationDetail, type CategoryOption, type CompanyOption } from '../../services/validation.service';
import { CompositionStep, Legend } from './composition';
import './ValidationWizardPage.css';

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
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState({ manufacturer: '', distributor: '', importer: '' });
  const [meta, setMeta] = useState<Meta | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDetail = async () => { setDetail(await ValidationService.getDetail(id)); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, cats, comps] = await Promise.all([
          ValidationService.getDetail(id), ValidationService.getCategories(), ValidationService.getCompanies(),
        ]);
        setDetail(d); setMeta(toMeta(d.product)); setCategories(cats); setCompanies(comps);
        const sel = { manufacturer: '', distributor: '', importer: '' };
        for (const pc of d.companies ?? []) {
          const role = pc.role.toLowerCase() as keyof typeof sel;
          if (role in sel) sel[role] = pc.companyId;
        }
        setSelectedCompanyIds(sel);
      } finally { setLoading(false); }
    })();
  }, [id]);

  const set = (k: keyof Meta, v: any) => setMeta((m) => (m ? { ...m, [k]: v } : m));

  const onCompanySelect = (role: 'manufacturer' | 'distributor' | 'importer', companyId: string) =>
    setSelectedCompanyIds((s) => ({ ...s, [role]: companyId }));

  const buildCompanyData = () => {
    const out: Array<{ companyId: string; role: string }> = [];
    if (selectedCompanyIds.manufacturer) out.push({ companyId: selectedCompanyIds.manufacturer, role: 'MANUFACTURER' });
    if (selectedCompanyIds.distributor) out.push({ companyId: selectedCompanyIds.distributor, role: 'DISTRIBUTOR' });
    if (selectedCompanyIds.importer) out.push({ companyId: selectedCompanyIds.importer, role: 'IMPORTER' });
    return out;
  };

  const saveMeta = async () => {
    if (!meta) return;
    await ValidationService.updateMeta(id, {
      name: meta.name, brand: meta.brand, barcode: meta.barcode, image: meta.image,
      categoryId: meta.categoryId || null, registrationName: meta.registrationName, registrationCode: meta.registrationCode,
      legalName: meta.legalName, alcoholGraduation: meta.alcoholGraduation === '' ? null : Number(meta.alcoholGraduation),
      source: meta.source || null, servingSizeAmount: meta.servingSizeAmount === '' ? null : Number(meta.servingSizeAmount),
      servingSizeUnit: meta.servingSizeUnit, isUltraProcessed: meta.isUltraProcessed, isFatAlert: meta.isFatAlert,
      isSaturatedFatAlert: meta.isSaturatedFatAlert, isSugarAlert: meta.isSugarAlert, isSodiumAlert: meta.isSodiumAlert,
      companyData: buildCompanyData(),
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
      <div className="vw-container">
        <button className="vw-back" onClick={() => navigate('/validation')}>← Volver a la lista</button>

        <Stepper step={step} onStep={(s) => setStep(s)} />

        {/* PASO 1 — Básico */}
        {step === 0 && (
          <div className="vw-card">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <label className="vw-photo-label">
                {meta.image ? <img src={meta.image} alt="" className="vw-photo-img" />
                  : <div className="vw-photo-empty">Sin foto</div>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
                <div className="vw-photo-change">📷 Cambiar</div>
              </label>
              <div style={{ flex: 1 }} className="vw-form-grid">
                <div className="form-group form-group-full">
                  <Input label="Nombre" value={meta.name} onChange={(e) => set('name', e.target.value)} fullWidth />
                </div>
                <div className="form-group">
                  <Input label="Marca" value={meta.brand} onChange={(e) => set('brand', e.target.value)} fullWidth />
                </div>
                <div className="form-group">
                  <Input label="Código de barras" value={meta.barcode} onChange={(e) => set('barcode', e.target.value)} fullWidth />
                </div>
                <div className="form-group form-group-full">
                  <Input label="o pegá una URL de imagen" value={meta.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" fullWidth />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 — Composición + fotos del usuario */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><Legend /></div>
            <div className="vw-card"><CompositionStep productId={id} detail={detail} busy={busy} setBusy={setBusy} onChanged={loadDetail} /></div>
            <div className="vw-card">
              <h3 style={{ fontSize: 15, margin: '0 0 10px', color: 'var(--color-primary-dark)' }}>Fotos cargadas por el usuario</h3>
              <ProductSourceImagesSection productId={id} />
            </div>
          </>
        )}

        {/* PASO 3 — Más info */}
        {step === 2 && (
          <div className="vw-card">
            <div className="vw-form-grid">
              <div className="form-group form-group-full">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={meta.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <Input label="Nombre de registro" value={meta.registrationName} onChange={(e) => set('registrationName', e.target.value)} fullWidth />
              </div>
              <div className="form-group">
                <Input label="Código de registro (RNPA/RNE)" value={meta.registrationCode} onChange={(e) => set('registrationCode', e.target.value)} fullWidth />
              </div>
              <div className="form-group form-group-full">
                <Input label="Razón social / nombre legal" value={meta.legalName} onChange={(e) => set('legalName', e.target.value)} fullWidth />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">Empresas (opcional)</label>
              <ProductCompaniesSection
                companies={companies as any}
                loadingCompanies={false}
                selectedCompanyIds={selectedCompanyIds}
                onCompanySelect={onCompanySelect}
              />
            </div>

            <div className="vw-form-grid" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Origen del dato</label>
                <select className="form-select" value={meta.source} onChange={(e) => set('source', e.target.value)}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                </select>
              </div>
              <div className="form-group">
                <Input label="Graduación alcohólica (% vol)" type="number" value={meta.alcoholGraduation} onChange={(e) => set('alcoholGraduation', e.target.value)} fullWidth />
              </div>
              <div className="form-group">
                <Input label="Porción (cantidad)" type="number" value={meta.servingSizeAmount} onChange={(e) => set('servingSizeAmount', e.target.value)} fullWidth />
              </div>
              <div className="form-group">
                <Input label="Porción (unidad)" value={meta.servingSizeUnit} onChange={(e) => set('servingSizeUnit', e.target.value)} placeholder="g / ml" fullWidth />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Octógonos / alertas</label>
              <div className="vw-checks">
                <Check label="Ultraprocesado" v={meta.isUltraProcessed} on={(v) => set('isUltraProcessed', v)} />
                <Check label="Exceso grasas" v={meta.isFatAlert} on={(v) => set('isFatAlert', v)} />
                <Check label="Exceso grasas sat." v={meta.isSaturatedFatAlert} on={(v) => set('isSaturatedFatAlert', v)} />
                <Check label="Exceso azúcares" v={meta.isSugarAlert} on={(v) => set('isSugarAlert', v)} />
                <Check label="Exceso sodio" v={meta.isSodiumAlert} on={(v) => set('isSodiumAlert', v)} />
              </div>
            </div>
          </div>
        )}

        {/* PASO 4 — Finalizar */}
        {step === 3 && (
          <div className="vw-card">
            <h3 style={{ marginTop: 0, color: 'var(--color-primary-dark)' }}>Listo para finalizar</h3>
            <p style={{ color: 'var(--color-grey-600)' }}>
              <strong>Completar</strong>: guarda los cambios pero el producto sigue pendiente en la cola.<br />
              <strong>Completar y validar</strong>: guarda y marca el producto como validado (sale de la cola y pasa a usar las tablas estructuradas).
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button variant="outline" onClick={() => onComplete(false)} disabled={busy}>Completar</Button>
              <Button variant="primary" onClick={() => onComplete(true)} disabled={busy}>Completar y validar ✓</Button>
            </div>
          </div>
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
    <div className="vw-stepper">
      {STEPS.map((label, i) => (
        <div key={label} className="vw-step" style={{ flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
          <button
            className={`vw-step-btn ${i === step ? 'is-current' : i < step ? 'is-done' : ''}`}
            onClick={() => onStep(i)}
          >
            <span className="vw-step-dot">{i < step ? '✓' : i + 1}</span>
            {label}
          </button>
          {i < STEPS.length - 1 && <div className={`vw-step-line ${i < step ? 'is-done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return <label className="vw-check"><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}</label>;
}
