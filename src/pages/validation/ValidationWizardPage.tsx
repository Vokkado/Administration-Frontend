/**
 * Wizard de validación paso a paso (un producto):
 *   1. Básico        — foto, nombre, marca, código de barras (editable).
 *   2. Composición   — ingredientes/alérgenos/nutrición coloreados + fotos que cargó el usuario.
 *   3. Más info      — categoría, registro legal, fabricante/origen, alcohol, porción, alertas.
 *   4. Finalizar     — "Completar" (guarda, queda pendiente) / "Completar y validar".
 */
import { useEffect, useState } from 'react';
import { validatedByText } from '../../utils/validatedBy';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, Input, LoadingSpinner, ConfirmDialog } from '../../components/ui';
import { ProductCompaniesSection } from '../products/components/product-modal';
import type { SourcePhotoKey } from '../../hooks/useSourceImages';
import { ValidationService, type ValidationDetail, type CategoryOption, type CompanyOption, NEEDS_PHOTO_LABELS, needsPhotosText, needsPhotosShort, type NeedsPhotoPart } from '../../services/validation.service';
import { AiSuggestPanel, CompositionStep, Legend, TagsSection } from './composition';
import { SourceImagesPanel } from './SourceImagesPanel';
import { AiSourcesInfo } from './AiSourcesInfo';
import { DecreePanel } from './DecreePanel';

/** Mismo texto por defecto que el Backend (ProductValidationService.DEFAULT_APPROVAL_MESSAGE). */
const DEFAULT_APPROVAL_MESSAGE = 'Vokkado validó tu producto. ¡Gracias por ayudar a las personas a elegir mejor!';
import { ArSealsPanel } from './ArSealsPanel';
import type { ArSeal } from './arFrontCheck';
import { ScorePreviewPanel } from './ScorePreviewPanel';
import { NovaPanel } from './NovaPanel';
import { KcalPanel } from './KcalPanel';
import { NAME_RULE_HINT, BRAND_RULE_HINT, checkName, normalizeBrand } from './nameRules';
import { NOVA4_HINT } from '../../constants/nova';
import './ValidationWizardPage.css';

const STEPS = ['Básico', 'Composición', 'Más info', 'Finalizar'];
/**
 * Foto del usuario que conviene tener a la vista en cada paso: la portada para nombre, marca
 * y cierre; la etiqueta de ingredientes para la composición y para "Más info", porque el
 * registro y la razón social suelen estar impresos al lado de los ingredientes.
 */
const STEP_PHOTO: SourcePhotoKey[] = ['cover', 'ingredients', 'ingredients', 'cover'];
const SOURCES = ['', 'pos', 'eldorado', 'disco', 'tiendainglesa', 'manual'];

type Meta = {
  name: string; brand: string; barcode: string; image: string; categoryId: string;
  registrationName: string; registrationCode: string; legalName: string;
  alcoholGraduation: string; source: string; servingSizeAmount: string; servingSizeUnit: string;
  isUltraProcessed: boolean; isFatAlert: boolean; isSaturatedFatAlert: boolean; isSugarAlert: boolean; isSodiumAlert: boolean;
  /** Sellos argentinos del envase (producto importado). arEnabled = el envase trae sellos argentinos. */
  arEnabled: boolean; arSeals: ArSeal[];
};

const toMeta = (p: ValidationDetail['product']): Meta => ({
  name: p.name ?? '', brand: p.brand ?? '', barcode: p.barcode ?? '', image: p.image ?? '', categoryId: p.categoryId ?? '',
  registrationName: p.registrationName ?? '', registrationCode: p.registrationCode ?? '', legalName: p.legalName ?? '',
  alcoholGraduation: p.alcoholGraduation != null ? String(p.alcoholGraduation) : '', source: p.source ?? '',
  servingSizeAmount: p.servingSizeAmount != null ? String(p.servingSizeAmount) : '', servingSizeUnit: p.servingSizeUnit ?? '',
  isUltraProcessed: !!p.isUltraProcessed, isFatAlert: !!p.isFatAlert, isSaturatedFatAlert: !!p.isSaturatedFatAlert,
  isSugarAlert: !!p.isSugarAlert, isSodiumAlert: !!p.isSodiumAlert,
  arEnabled: (p.frontSeals?.AR?.length ?? 0) > 0, arSeals: (p.frontSeals?.AR ?? []) as ArSeal[],
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
  // Aviso a quien cargó el producto al "Completar y validar" (prendido por defecto, mensaje editable).
  const [notify, setNotify] = useState(true);
  const [notifyMessage, setNotifyMessage] = useState(DEFAULT_APPROVAL_MESSAGE);
  const [showReject, setShowReject] = useState(false);
  // "Falta información: pedir fotos" (paso Finalizar): se abre un recuadro con nota opcional.
  const [showNeedsPhotos, setShowNeedsPhotos] = useState(false);
  const [needsPhotosNote, setNeedsPhotosNote] = useState('');
  // Qué fotos faltan: solo se le piden esas al usuario.
  const [needsParts, setNeedsParts] = useState<NeedsPhotoPart[]>([]);
  // Al abrir: si ya estaba marcado, arranca con lo que falta tildado y la nota cargada (para editarla).
  const openNeedsPhotos = () => {
    if (!showNeedsPhotos && detail?.product.needsPhotos) {
      setNeedsParts((detail.product.needsPhotosParts as NeedsPhotoPart[] | null | undefined)?.length
        ? (detail.product.needsPhotosParts as NeedsPhotoPart[])
        : ['cover', 'nutrition', 'ingredients']);
      setNeedsPhotosNote(detail.product.needsPhotosNote ?? '');
    }
    setShowNeedsPhotos((v) => !v);
  };
  const toggleNeedsPart = (p: NeedsPhotoPart) => setNeedsParts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const [error, setError] = useState<string | null>(null);

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

  // Seguridad (#11): la URL de imagen debe ser https — acá se BLOQUEA el guardado (el hint rojo
  // del input es solo aviso). Evita persistir URLs http que el CSP igual no renderiza y que la app
  // móvil (sin cleartext) tampoco puede cargar.
  const imageUrlInvalid = !!meta?.image && !/^https:\/\/.+/.test(meta.image);

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
      // Sellos argentinos del envase: siempre se manda el estado actual ([] = no trae), así destildar
      // "El envase trae sellos argentinos" borra lo guardado antes en esta misma sesión.
      frontSeals: { AR: meta.arEnabled ? meta.arSeals : [] },
    });
  };

  const goNext = async () => {
    // Al salir de los pasos con campos meta (0 y 2) persistimos.
    if (step === 0 || step === 2) {
      if (imageUrlInvalid) {
        setError('La URL de la imagen debe comenzar con https:// (no se permite http://). Corregila o borrala para continuar.');
        return;
      }
      setBusy(true);
      try {
        await saveMeta();
      } catch {
        setError('No pudimos guardar los cambios. Revisá tu conexión e intentá de nuevo.');
        setBusy(false);
        return; // No avanzamos de paso si el guardado falló (evita perder cambios en silencio).
      }
      setBusy(false);
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onComplete = async (validate: boolean) => {
    if (imageUrlInvalid) {
      setError('La URL de la imagen debe comenzar con https:// (no se permite http://). Corregila o borrala para continuar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveMeta();
      if (validate) {
        const r = await ValidationService.approve(id, { notifyUploader: notify, notifyMessage: notifyMessage.trim() || undefined });
        if (notify && r.notification === 'no_devices') window.alert('Validado ✓. No se pudo avisar: quien lo cargó no tiene las notificaciones activadas en su celular.');
        else if (notify && r.notification === 'failed') window.alert('Validado ✓. No se pudo mandar el aviso (falló el envío); se reintenta la próxima vez que lo valides.');
      }
      navigate('/validation');
    } catch {
      setError(validate
        ? 'No pudimos validar el producto. Revisá tu conexión e intentá de nuevo.'
        : 'No pudimos guardar los cambios. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  // "Falta información": guarda lo hecho, marca el producto y vuelve a la lista. El próximo que lo
  // escanee tiene que sacar las 3 fotos; al llegar, la marca se limpia sola.
  const onNeedsPhotos = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveMeta();
      await ValidationService.setNeedsPhotos(id, needsPhotosNote.trim() || undefined, needsParts);
      navigate('/validation');
    } catch {
      setError('No pudimos marcar el producto. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };
  const onClearNeedsPhotos = async () => {
    setBusy(true);
    try { await ValidationService.clearNeedsPhotos(id); await loadDetail(); }
    catch { setError('No pudimos quitar la marca.'); }
    finally { setBusy(false); }
  };

  // Descartar (soft-reject): saca el producto de la cola conservando el registro. No da puntos.
  const onReject = async () => {
    setBusy(true);
    setError(null);
    try {
      await ValidationService.reject(id);
      setShowReject(false);
      navigate('/validation');
    } catch {
      setShowReject(false);
      setError('No pudimos descartar el producto. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  // Deshace el rechazo: vuelve a la cola como pendiente (si nadie re-subió el mismo código).
  const onUnreject = async () => {
    setBusy(true);
    setError(null);
    try { await ValidationService.unreject(id); await loadDetail(); }
    catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'No pudimos volverlo a la cola. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    setError(null);
    try {
      set('image', await ValidationService.uploadImage(f));
    } catch {
      setError('No pudimos subir la imagen. Probá con otra o reintentá.');
    } finally { setBusy(false); }
  };

  if (loading || !detail || !meta) return <AdminLayout className="page-validation"><LoadingSpinner /></AdminLayout>;


  return (
    <AdminLayout className="page-validation">
      <div className="vw-container">
        <div className="vw-topbar">
          <button className="vw-back" onClick={() => navigate('/validation')}>← Volver a la lista</button>
          {/* Siempre disponible: rechazar/eliminar el producto en cualquier paso. No otorga puntos. */}
          {detail.product.isRejected
            ? <Button variant="primary" onClick={onUnreject} disabled={busy}>↩ Volver a la cola</Button>
            : <Button variant="danger" onClick={() => setShowReject(true)} disabled={busy}>Rechazar producto</Button>}
        </div>

        {error && <div className="vw-error" role="alert">{error}</div>}

        {detail.product.isInspected && !detail.product.isRejected && (
          <div className="vw-needs-photos vw-validated" role="status">
            <div><strong>✅ {validatedByText(detail.product.validatedByEmail, detail.product.validatedAt)}</strong> — ya está validado; si cambiás algo, se guarda igual.</div>
          </div>
        )}

        {detail.product.isRejected && (
          <div className="vw-needs-photos vw-rejected" role="status">
            <div>
              <strong>🚫 Rechazado</strong>{detail.product.rejectedByEmail ? ` por ${detail.product.rejectedByEmail}` : ''}{detail.product.rejectedAt ? ` el ${new Date(detail.product.rejectedAt).toLocaleDateString('es-UY')}` : ''} — no aparece en la cola ni en la app (ni al escanear ni al buscar). Si se rechazó por error, volvelo a la cola; para validarlo primero tiene que volver.
              {detail.product.rejectedReason && <div style={{ marginTop: 4 }}>Motivo: {detail.product.rejectedReason}</div>}
            </div>
            <Button variant="primary" size="small" onClick={onUnreject} disabled={busy}>↩ Volver a la cola</Button>
          </div>
        )}

        {detail.product.needsPhotos && (
          <div className="vw-needs-photos" role="status">
            <div>
              <strong>📷 Info insuficiente · {needsPhotosShort(detail.product.needsPhotosParts)}</strong> — esperando foto de {needsPhotosText(detail.product.needsPhotosParts)}. El próximo usuario que lo escanee (o lo busque) tiene que sacarla antes de ver el análisis; cuando llegue, la marca se quita sola y el producto vuelve a la cola con la foto nueva.
              {detail.product.needsPhotosNote && <div style={{ marginTop: 4 }}>Nota: {detail.product.needsPhotosNote}</div>}
            </div>
            <Button variant="outline" size="small" onClick={onClearNeedsPhotos} disabled={busy}>Quitar marca</Button>
          </div>
        )}

        <Stepper step={step} onStep={(s) => setStep(s)} />

        {/* Todos los pasos: el contenido a la izquierda y las fotos del usuario a la derecha,
            para contrastar cada dato contra la etiqueta sin abrirla. El panel de fotos se
            monta una sola vez, así no se vuelven a pedir ni se pierde la foto elegida. */}
        <div className="vw-split">
          <div className="vw-split-main">
            {/* PASO 1 — Básico */}
            {step === 0 && (
              <>
                <div className="vw-card">
                  <div className="vw-basics-row">
                    <label className="vw-photo-label">
                      {meta.image ? <img src={meta.image} alt="" className="vw-photo-img" />
                        : <div className="vw-photo-empty">Sin foto</div>}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
                      <div className="vw-photo-change">📷 Cambiar</div>
                    </label>
                    <div style={{ flex: 1 }} className="vw-form-grid">
                      <div className="form-group form-group-full">
                        <Input label="Nombre" value={meta.name} onChange={(e) => set('name', e.target.value)} fullWidth />
                        <small className="vw-rule-hint">{NAME_RULE_HINT}</small>
                        {checkName(meta.name, meta.brand).map((iss) => (
                          <small key={iss.text} className="vw-rule-warn">
                            ⚠️ {iss.text}
                            {iss.fix && <button type="button" className="nova-btn" onClick={() => set('name', iss.fix!)}>Aplicar</button>}
                          </small>
                        ))}
                      </div>
                      <div className="form-group">
                        <Input label="Marca" value={meta.brand} onChange={(e) => set('brand', e.target.value)} fullWidth />
                        <small className="vw-rule-hint">{BRAND_RULE_HINT}</small>
                        {meta.brand.trim() && normalizeBrand(meta.brand) !== meta.brand.trim() && (
                          <small className="vw-rule-warn">
                            ⚠️ ¿"{normalizeBrand(meta.brand)}"? (salvo que la marca se escriba así en el envase)
                            <button type="button" className="nova-btn" onClick={() => set('brand', normalizeBrand(meta.brand))}>Aplicar</button>
                          </small>
                        )}
                      </div>
                      <div className="form-group">
                        <Input label="Código de barras" value={meta.barcode} onChange={(e) => set('barcode', e.target.value)} fullWidth />
                      </div>
                      {(() => {
                        // La portada no puede ser la foto que sacó el usuario (es privada, R41): avisar y ofrecer
                        // las portadas que publican súper/marca por código de barras.
                        const userCover = detail.product.labelSources?.userPhotos?.cover ?? null;
                        const isUserPhoto = !!meta.image && (meta.image === userCover || meta.image.includes(`/products/${id}/cover`));
                        const fronts = (detail.product.labelSources?.sources ?? [])
                          .filter((s) => s.coverUrl && s.matchedByEan !== false)
                          .slice(0, 3);
                        if (!isUserPhoto && meta.image) return null;
                        return (
                          <div className="form-group form-group-full">
                            <div className="vw-cover-warn">
                              ⚠️ {meta.image ? 'La portada es la foto que sacó el usuario: cambiala por una oficial (súper o marca).' : 'Falta la portada: poné una oficial (súper o marca).'}
                              {fronts.length > 0 && (
                                <div className="vw-cover-options">
                                  {fronts.map((s) => (
                                    <button key={s.coverUrl!} type="button" className="vw-cover-option" onClick={() => set('image', s.coverUrl!)} title={`Usar la de ${s.store}`}>
                                      <img src={s.coverUrl!} alt="" /><span>{s.store}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {fronts.length === 0 && detail.product.labelSources?.fetchedAt && (
                                <span> Ya se buscó por código y ningún súper ni marca la tiene: buscala a mano (web de la marca, Google Imágenes) y pegá la URL abajo.</span>
                              )}
                              {fronts.length === 0 && !detail.product.labelSources?.fetchedAt && (
                                <span> Buscala por código de barras en el súper o la web de la marca y pegá la URL abajo.{' '}
                                  <button type="button" className="nova-btn" disabled={busy}
                                    onClick={async () => { setBusy(true); try { await ValidationService.aiSources(id); await loadDetail(); } catch { /* sin fuentes */ } finally { setBusy(false); } }}>
                                    Buscar por código (súper/marca)
                                  </button>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="form-group form-group-full">
                        <Input label="o pegá una URL de imagen" value={meta.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" fullWidth />
                        {meta.image && !/^https:\/\/.+/.test(meta.image) && (
                          <small className="form-hint" style={{ color: 'var(--color-error)' }}>
                            La URL debe comenzar con https:// (no se permite http:// por seguridad)
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PASO 2 — Composición */}
            {step === 1 && (
              // La leyenda va dentro de la card para que ésta arranque a la misma altura que las fotos.
              <div className="vw-card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><Legend /></div>
                <CompositionStep productId={id} detail={detail} busy={busy} setBusy={setBusy} onChanged={loadDetail} />
              </div>
            )}

            {/* PASO 3 — Más info */}
            {step === 2 && (
              <div className="vw-card">
                <div className="vw-form-grid">
                  <div className="form-group form-group-full">
                    <AiSuggestPanel
                      productId={id}
                      categoryId={meta.categoryId}
                      linkedTagIds={(detail?.tags ?? []).map((t) => t.tagId)}
                      busy={busy}
                      setBusy={setBusy}
                      onUseCategory={(categoryId) => set('categoryId', categoryId)}
                      onCategoryCreated={(c) => {
                        setCategories((list) => [...list, c].sort((a, b) => a.name.localeCompare(b.name, 'es')));
                        set('categoryId', c.id);
                      }}
                      onChanged={loadDetail}
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <label className="form-label">Categoría</label>
                    <select className="form-select" value={meta.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                      <option value="">— Sin categoría —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <TagsSection
                      productId={id}
                      categoryId={meta.categoryId}
                      tags={detail?.tags ?? []}
                      busy={busy}
                      setBusy={setBusy}
                      onChanged={loadDetail}
                    />
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
                  <label className="form-label">Octógonos de Uruguay (MSP) / alertas</label>
                  <div className="vw-checks">
                    <Check label="Ultraprocesado (NOVA 4)" hint={NOVA4_HINT} v={meta.isUltraProcessed} on={(v) => set('isUltraProcessed', v)} />
                    <Check label="Exceso grasas" v={meta.isFatAlert} on={(v) => set('isFatAlert', v)} />
                    <Check label="Exceso grasas sat." v={meta.isSaturatedFatAlert} on={(v) => set('isSaturatedFatAlert', v)} />
                    <Check label="Exceso azúcares" v={meta.isSugarAlert} on={(v) => set('isSugarAlert', v)} />
                    <Check label="Exceso sodio" v={meta.isSodiumAlert} on={(v) => set('isSodiumAlert', v)} />
                  </div>
                  <NovaPanel
                    ingredientNames={detail.ingredients.map((i) => i.variantName || i.ingredientName)}
                    value={meta.isUltraProcessed}
                    onSet={(v) => set('isUltraProcessed', v)}
                  />
                  <KcalPanel detail={detail} />
                  <DecreePanel
                    detail={detail}
                    name={meta.name}
                    servingSizeAmount={meta.servingSizeAmount}
                    servingSizeUnit={meta.servingSizeUnit}
                    values={{ isSodiumAlert: meta.isSodiumAlert, isSugarAlert: meta.isSugarAlert, isFatAlert: meta.isFatAlert, isSaturatedFatAlert: meta.isSaturatedFatAlert }}
                    onSet={(k, v) => set(k, v)}
                  />
                  <ArSealsPanel
                    detail={detail}
                    name={meta.name}
                    servingSizeAmount={meta.servingSizeAmount}
                    servingSizeUnit={meta.servingSizeUnit}
                    enabled={meta.arEnabled}
                    onEnabled={(v) => set('arEnabled', v)}
                    values={meta.arSeals}
                    onChange={(v) => set('arSeals', v)}
                  />
                </div>
              </div>
            )}

            {/* PASO 4 — Finalizar */}
            {step === 3 && (
              <div className="vw-card">
                <h3 style={{ marginTop: 0, color: 'var(--color-primary-dark)' }}>Listo para finalizar</h3>
                <p style={{ color: 'var(--color-grey-600)' }}>
                  <strong>Completar</strong>: guarda los cambios pero el producto sigue pendiente en la cola.<br />
                  <strong>Completar y validar</strong>: guarda y marca el producto como validado (sale de la cola y pasa a usar las tablas estructuradas). Los ingredientes NO se validan acá: los que estén sin validar siguen así hasta que alguien les cargue restricciones y atributos en Ingredientes. Le otorga puntos a quien lo cargó.<br />
                  <strong>Rechazar producto</strong> (arriba a la derecha, disponible en cualquier paso): el producto no sirve o está mal. Se marca rechazado (sale de la cola, conserva el registro) y NO otorga puntos.<br />
                  <strong>Falta información</strong>: ninguna fuente deja validarlo (fotos chicas, lista cortada, sin tabla). Guarda lo hecho y lo marca como <em>info insuficiente</em>: el próximo usuario que lo escanee o lo busque tiene que sacar las fotos que tildes (portada, tabla o ingredientes), y cuando lleguen vuelve a la cola con ellas.
                </p>
                <div className="vw-notify">
                  {detail.product.hasUploader === undefined ? null : !detail.product.hasUploader ? (
                    <span className="vw-notify-note">🔔 No lo cargó un usuario de la app: no hay a quién avisarle.</span>
                  ) : detail.product.approvalNotifiedAt ? (
                    <span className="vw-notify-note">🔔 Ya se le avisó a quien lo cargó ({new Date(detail.product.approvalNotifiedAt).toLocaleDateString('es-UY')}). No se vuelve a mandar.</span>
                  ) : (
                    <>
                      <label className="vw-notify-check">
                        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                        {' '}🔔 Al validar, avisarle a quien lo cargó (una sola vez)
                      </label>
                      {notify && (
                        <>
                          <textarea
                            className="vw-notify-msg"
                            value={notifyMessage}
                            maxLength={200}
                            rows={2}
                            onChange={(e) => setNotifyMessage(e.target.value)}
                          />
                          <span className="vw-notify-note">
                            Título: "¡Tu producto fue validado!" · {notifyMessage.length}/200
                            {notifyMessage !== DEFAULT_APPROVAL_MESSAGE && (
                              <> · <button type="button" className="vw-notify-reset" onClick={() => setNotifyMessage(DEFAULT_APPROVAL_MESSAGE)}>volver al mensaje de siempre</button></>
                            )}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="vw-finish-actions">
                  <Button variant="outline" onClick={openNeedsPhotos} disabled={busy}>📷 {detail.product.needsPhotos ? 'Editar lo que falta' : 'Falta información'}</Button>
                  <Button variant="outline" onClick={() => onComplete(false)} disabled={busy}>Completar</Button>
                  <Button variant="primary" onClick={() => onComplete(true)} disabled={busy}>Completar y validar ✓</Button>
                </div>
                <ScorePreviewPanel
                  productId={id}
                  beforeCalc={saveMeta}
                  isAlcoholic={meta.alcoholGraduation !== '' && Number(meta.alcoholGraduation) >= 0.5}
                />
                {showNeedsPhotos && (
                  <div className="vw-needs-photos-form">
                    <strong>¿Qué foto falta?</strong> <span style={{ fontSize: 13 }}>Solo se le pide al usuario lo que tildes.</span>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {(['cover', 'nutrition', 'ingredients'] as NeedsPhotoPart[]).map((p) => (
                        <label key={p} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                          <input type="checkbox" checked={needsParts.includes(p)} onChange={() => toggleNeedsPart(p)} />
                          {NEEDS_PHOTO_LABELS[p][0].toUpperCase() + NEEDS_PHOTO_LABELS[p].slice(1)}
                        </label>
                      ))}
                    </div>
                    <label htmlFor="np-note"><strong>Nota</strong> (opcional, la ve quien valide después)</label>
                    <textarea id="np-note" rows={2} maxLength={500} value={needsPhotosNote} onChange={(e) => setNeedsPhotosNote(e.target.value)}
                      placeholder="Ej.: la lista de ingredientes está cortada y no hay foto de la tabla" />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="outline" onClick={() => setShowNeedsPhotos(false)} disabled={busy}>Cancelar</Button>
                      <Button variant="primary" onClick={onNeedsPhotos} disabled={busy || needsParts.length === 0}>{detail.product.needsPhotos ? 'Guardar cambios' : `Marcar y pedir ${needsParts.length === 1 ? 'la foto' : 'las fotos'}`}</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="vw-split-aside">
            {/* Fotos arriba (se estiran) y, debajo, de dónde sacó cada dato el enriquecimiento IA. */}
            <div className="vw-split-aside-stack">
              <SourceImagesPanel productId={id} initialKey={STEP_PHOTO[step]} />
              <div className="vw-photo-panel vw-ai-panel">
                <AiSourcesInfo
                  sources={detail.product.enrichmentSources}
                  labelSources={detail.product.labelSources}
                  productId={id}
                  onChanged={loadDetail}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navegación entre pasos */}
        {step < 3 && (
          <div className="vw-step-nav">
            <Button variant="outline" onClick={goBack} disabled={busy || step === 0}>← Atrás</Button>
            <Button variant="primary" onClick={goNext} disabled={busy}>Siguiente →</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        show={showReject}
        title="¿Seguro que querés rechazar?"
        message="Significa que el producto no tiene sentido o está mal. Se marcará como rechazado y saldrá de la cola. El usuario que lo cargó NO va a recibir puntos."
        confirmText="Rechazar producto"
        cancelText="Cancelar"
        variant="danger"
        loading={busy}
        onConfirm={onReject}
        onCancel={() => setShowReject(false)}
      />
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
            <span className="vw-step-label">{label}</span>
          </button>
          {i < STEPS.length - 1 && <div className={`vw-step-line ${i < step ? 'is-done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function Check({ label, v, on, hint }: { label: string; v: boolean; on: (v: boolean) => void; hint?: string }) {
  return <label className="vw-check" title={hint}><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}</label>;
}
