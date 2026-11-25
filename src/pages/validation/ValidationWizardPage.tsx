/**
 * Validación de un producto, en una sola pantalla con pestañas:
 *   Portada · Ingredientes (con alérgenos) · Tabla nutricional (porción, octógonos, ultraprocesado)
 *   · Etiquetas (categoría y etiquetas) · Más datos (registro, empresas, origen, alcohol).
 *
 * El encabezado queda fijo con el producto (foto, nombre, estado) y las acciones:
 *   - Guardar: siempre visible, se activa con cambios; guarda y te quedás en la pantalla.
 *   - Validar: confirma (con el aviso a quien lo cargó), guarda, valida y vuelve a la lista.
 *   - Más acciones: pedir fotos que faltan / rechazar (o volver a la cola si estaba rechazado).
 *
 * Dos tipos de datos: ingredientes, alérgenos, tabla y etiquetas se guardan solos al instante;
 * el resto (meta: foto, nombre, porción, octógonos, categoría…) queda en pantalla hasta Guardar.
 * Por eso hay aviso de "Cambios sin guardar" y confirmación al salir con cambios.
 */
import { useEffect, useRef, useState } from 'react';
import { validatedByText } from '../../utils/validatedBy';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, Input, LoadingSpinner, ConfirmDialog, Modal, OctagonPicker, useToast, type MspOctagon } from '../../components/ui';
import { ProductCompaniesSection } from '../products/components/product-modal';
import type { SourcePhotoKey } from '../../hooks/useSourceImages';
import { ValidationService, type ValidationDetail, type CategoryOption, type CompanyOption, NEEDS_PHOTO_LABELS, needsPhotosText, needsPhotosShort, type NeedsPhotoPart, SKIPPED_TO_PART, skippedPhotosText } from '../../services/validation.service';
import { AiSuggestPanel, CompositionStep, Legend, TagsSection } from './composition';
import { SourceImagesPanel } from './SourceImagesPanel';
import { ScoreTablePhotos } from './ScoreTablePhotos';
import { AiSourcesInfo } from './AiSourcesInfo';
import { DecreePanel } from './DecreePanel';
import { checkDecree, type DecreeKey } from './decreeCheck';
import { ArSealsPanel } from './ArSealsPanel';
import type { ArSeal } from './arFrontCheck';
import { ScorePreviewPanel } from './ScorePreviewPanel';
import { NovaPanel } from './NovaPanel';
import { KcalPanel } from './KcalPanel';
import { NAME_RULE_HINT, BRAND_RULE_HINT, checkName, normalizeBrand } from './nameRules';
import { NOVA4_HINT } from '../../constants/nova';
import './ValidationWizardPage.css';

/** Mismo texto por defecto que el Backend (ProductValidationService.DEFAULT_APPROVAL_MESSAGE). */
const DEFAULT_APPROVAL_MESSAGE = 'Vokkado validó tu producto. ¡Gracias por ayudar a las personas a elegir mejor!';

type Tab = 'portada' | 'ingredientes' | 'alergenos' | 'tabla' | 'etiquetas' | 'mas';
/**
 * Pestañas en el orden en que se valida. `photo`: la foto del usuario que conviene tener al lado
 * (la portada para nombre y etiquetas; la lista de ingredientes también para los alérgenos y "Más
 * datos", porque los alérgenos, el registro y la razón social suelen estar impresos al lado).
 */
const TABS: Array<{ key: Tab; label: string; photo: SourcePhotoKey }> = [
  { key: 'portada', label: 'Portada', photo: 'cover' },
  { key: 'ingredientes', label: 'Ingredientes', photo: 'ingredients' },
  { key: 'alergenos', label: 'Alérgenos', photo: 'ingredients' },
  { key: 'tabla', label: 'Tabla nutricional', photo: 'nutritionFacts' },
  { key: 'etiquetas', label: 'Etiquetas', photo: 'cover' },
  { key: 'mas', label: 'Más datos', photo: 'ingredients' },
];
const SOURCES = ['', 'pos', 'eldorado', 'disco', 'tiendainglesa', 'manual'];

type Meta = {
  name: string; brand: string; barcode: string; image: string; categoryId: string;
  registrationName: string; registrationCode: string; legalName: string;
  alcoholGraduation: string; source: string; servingSizeAmount: string; servingSizeUnit: string;
  isUltraProcessed: boolean; isFatAlert: boolean; isSaturatedFatAlert: boolean; isSugarAlert: boolean; isSodiumAlert: boolean;
  /** Sellos argentinos del envase (producto importado). arEnabled = el envase trae sellos argentinos. */
  arEnabled: boolean; arSeals: ArSeal[];
};
type CompanyIds = { manufacturer: string; distributor: string; importer: string };

const toMeta = (p: ValidationDetail['product']): Meta => ({
  name: p.name ?? '', brand: p.brand ?? '', barcode: p.barcode ?? '', image: p.image ?? '', categoryId: p.categoryId ?? '',
  registrationName: p.registrationName ?? '', registrationCode: p.registrationCode ?? '', legalName: p.legalName ?? '',
  alcoholGraduation: p.alcoholGraduation != null ? String(p.alcoholGraduation) : '', source: p.source ?? '',
  servingSizeAmount: p.servingSizeAmount != null ? String(p.servingSizeAmount) : '', servingSizeUnit: p.servingSizeUnit ?? '',
  isUltraProcessed: !!p.isUltraProcessed, isFatAlert: !!p.isFatAlert, isSaturatedFatAlert: !!p.isSaturatedFatAlert,
  isSugarAlert: !!p.isSugarAlert, isSodiumAlert: !!p.isSodiumAlert,
  arEnabled: (p.frontSeals?.AR?.length ?? 0) > 0, arSeals: (p.frontSeals?.AR ?? []) as ArSeal[],
});

/** Foto de lo guardado: si lo que hay en pantalla difiere, hay cambios sin guardar. */
const snapshot = (m: Meta, c: CompanyIds) => JSON.stringify({ m, c });

const IMAGE_URL_ERROR = 'La URL de la imagen debe comenzar con https:// (no se permite http://). Corregila o borrala para continuar.';

export function ValidationWizardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ValidationDetail | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<CompanyIds>({ manufacturer: '', distributor: '', importer: '' });
  const [meta, setMeta] = useState<Meta | null>(null);
  const [saved, setSaved] = useState('');
  // `?tab=tabla` abre directo en esa pestaña (lo usa "Fotos para el puntaje" para ir a la tabla nutricional).
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.key === t) ? (t as Tab) : 'portada';
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Encabezado fijo: su alto (cambia al envolverse) corre las fotos fijas de la derecha.
  const headRef = useRef<HTMLDivElement | null>(null);
  const [headH, setHeadH] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [showValidate, setShowValidate] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showReject, setShowReject] = useState(false);

  // Aviso a quien cargó el producto al validar (prendido por defecto, mensaje editable).
  const [notify, setNotify] = useState(true);
  // Ingredientes que ningún veredicto ve (sin atributos ni restricciones): hay que confirmar para validar igual.
  const [validateAnyway, setValidateAnyway] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState(DEFAULT_APPROVAL_MESSAGE);
  // "Pedir fotos que faltan": diálogo con qué fotos y una nota opcional.
  const [showNeedsPhotos, setShowNeedsPhotos] = useState(false);
  const [needsPhotosNote, setNeedsPhotosNote] = useState('');
  const [needsParts, setNeedsParts] = useState<NeedsPhotoPart[]>([]);
  // Al abrir: si ya estaba marcado, arranca con lo que falta tildado y la nota cargada (para editarla).
  const openNeedsPhotos = () => {
    setMenuOpen(false);
    if (detail?.product.needsPhotos) {
      setNeedsParts((detail.product.needsPhotosParts as NeedsPhotoPart[] | null | undefined)?.length
        ? (detail.product.needsPhotosParts as NeedsPhotoPart[])
        : ['cover', 'nutrition', 'ingredients']);
      setNeedsPhotosNote(detail.product.needsPhotosNote ?? '');
    }
    setShowNeedsPhotos(true);
  };
  // Partes que quien cargó salteó porque el envase no las tiene: no tiene sentido pedirlas.
  const skippedParts: NeedsPhotoPart[] = (detail?.product.skippedLabelPhotos ?? []).map((s) => SKIPPED_TO_PART[s]);
  const toggleNeedsPart = (p: NeedsPhotoPart) => setNeedsParts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const loadDetail = async () => { setDetail(await ValidationService.getDetail(id)); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, cats, comps] = await Promise.all([
          ValidationService.getDetail(id), ValidationService.getCategories(), ValidationService.getCompanies(),
        ]);
        const sel: CompanyIds = { manufacturer: '', distributor: '', importer: '' };
        for (const pc of d.companies ?? []) {
          const role = pc.role.toLowerCase() as keyof CompanyIds;
          if (role in sel) sel[role] = pc.companyId;
        }
        const m = toMeta(d.product);
        setDetail(d); setMeta(m); setCategories(cats); setCompanies(comps);
        setSelectedCompanyIds(sel);
        setSaved(snapshot(m, sel));
      } finally { setLoading(false); }
    })();
  }, [id]);

  const dirty = !!meta && saved !== snapshot(meta, selectedCompanyIds);

  // Cerrar o recargar la pestaña del navegador con cambios sin guardar: el navegador pregunta.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // El menú "Más acciones" se cierra al tocar fuera de él.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

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

  /** Guarda los datos de la ficha (meta + empresas) y deja eso como "lo guardado". */
  const saveMeta = async () => {
    if (!meta) return;
    await ValidationService.updateMeta(id, {
      name: meta.name, brand: meta.brand, barcode: meta.barcode, image: meta.image,
      categoryId: meta.categoryId || null, registrationName: meta.registrationName, registrationCode: meta.registrationCode,
      legalName: meta.legalName, alcoholGraduation: meta.alcoholGraduation === '' ? null : Number(meta.alcoholGraduation),
      source: meta.source || null, servingSizeAmount: meta.servingSizeAmount === '' ? null : Number(meta.servingSizeAmount.replace(',', '.')),
      servingSizeUnit: meta.servingSizeUnit || null, isUltraProcessed: meta.isUltraProcessed, isFatAlert: meta.isFatAlert,
      isSaturatedFatAlert: meta.isSaturatedFatAlert, isSugarAlert: meta.isSugarAlert, isSodiumAlert: meta.isSodiumAlert,
      companyData: buildCompanyData(),
      // Sellos argentinos del envase: siempre se manda el estado actual ([] = no trae), así destildar
      // "El envase trae sellos argentinos" borra lo guardado antes en esta misma sesión.
      frontSeals: { AR: meta.arEnabled ? meta.arSeals : [] },
    });
    setSaved(snapshot(meta, selectedCompanyIds));
  };

  const onSave = async () => {
    if (!dirty || busy) return;
    if (imageUrlInvalid) { setError(IMAGE_URL_ERROR); return; }
    setBusy(true);
    setError(null);
    try {
      await saveMeta();
      toast.success('Guardado', 'Los cambios del producto quedaron guardados.');
    } catch {
      toast.error('No se pudo guardar', 'Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  const onValidate = async () => {
    if (imageUrlInvalid) { setShowValidate(false); setError(IMAGE_URL_ERROR); return; }
    setBusy(true);
    setError(null);
    try {
      await saveMeta();
      const r = await ValidationService.approve(id, { notifyUploader: notify, notifyMessage: notifyMessage.trim() || undefined });
      // El aviso queda a la vista ya de vuelta en la lista (el proveedor vive arriba de las páginas).
      const name = meta?.name || 'El producto';
      if (notify && r.notification === 'no_devices') {
        toast.warning('Validado, sin aviso', `${name} quedó validado, pero quien lo cargó no tiene las notificaciones activadas en su celular.`);
      } else if (notify && r.notification === 'failed') {
        toast.warning('Validado, sin aviso', `${name} quedó validado, pero falló el envío del aviso. Se reintenta la próxima vez que lo valides.`);
      } else {
        toast.success('Producto validado', `${name} salió de la cola.`);
      }
      navigate('/validation');
    } catch {
      setShowValidate(false);
      toast.error('No se pudo validar', 'Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  // "Pedir fotos que faltan": guarda lo hecho, marca el producto y vuelve a la lista. El próximo que
  // lo escanee tiene que sacar las fotos tildadas; al llegar, la marca se limpia sola.
  const onNeedsPhotos = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveMeta();
      await ValidationService.setNeedsPhotos(id, needsPhotosNote.trim() || undefined, needsParts);
      toast.info('Fotos pedidas', 'Vuelve a la cola cuando un usuario las saque.');
      navigate('/validation');
    } catch {
      setShowNeedsPhotos(false);
      setError('No pudimos marcar el producto. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };
  const onClearNeedsPhotos = async () => {
    setBusy(true);
    try { await ValidationService.clearNeedsPhotos(id); await loadDetail(); }
    catch { setError('No pudimos quitar la marca.'); }
    finally { setBusy(false); }
  };

  // Rechazar (soft-reject): saca el producto de la cola conservando el registro. No da puntos.
  const onReject = async () => {
    setBusy(true);
    setError(null);
    try {
      await ValidationService.reject(id);
      setShowReject(false);
      navigate('/validation');
    } catch {
      setShowReject(false);
      setError('No pudimos rechazar el producto. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  // Deshace el rechazo: vuelve a la cola como pendiente (si nadie re-subió el mismo código).
  const onUnreject = async () => {
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try { await ValidationService.unreject(id); await loadDetail(); }
    catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'No pudimos volverlo a la cola. Revisá tu conexión e intentá de nuevo.');
    } finally { setBusy(false); }
  };

  const onBack = () => { if (dirty) setShowLeave(true); else navigate('/validation'); };
  const onSaveAndLeave = async () => {
    if (imageUrlInvalid) { setShowLeave(false); setError(IMAGE_URL_ERROR); return; }
    setBusy(true);
    try { await saveMeta(); toast.success('Guardado', 'Los cambios del producto quedaron guardados.'); navigate('/validation'); }
    catch { setShowLeave(false); toast.error('No se pudo guardar', 'Revisá tu conexión e intentá de nuevo.'); }
    finally { setBusy(false); }
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

  const p = detail.product;
  const blindIngredients = detail.ingredients.filter((i) => i.hasVerdictData === false);
  // La portada no puede ser la foto que sacó el usuario (es privada, R41).
  const userCover = p.labelSources?.userPhotos?.cover ?? null;
  const isUserPhoto = !!meta.image && (meta.image === userCover || meta.image.includes(`/products/${id}/cover`));
  const nameIssues = checkName(meta.name, meta.brand);

  // Lo que queda por mirar en cada pestaña (el número al lado del nombre).
  const pending: Record<Tab, { n: number; hint: string }> = {
    portada: {
      n: (!meta.image || isUserPhoto ? 1 : 0) + nameIssues.length,
      hint: 'Portada del usuario o sin portada, y avisos sobre el nombre',
    },
    ingredientes: {
      n: detail.ingredients.filter((i) => i.color !== 'green').length,
      hint: 'Ingredientes para revisar',
    },
    alergenos: {
      n: detail.allergens.filter((a) => a.color !== 'green').length,
      hint: 'Alérgenos para revisar',
    },
    tabla: {
      n: detail.nutrition.filter((n) => n.color !== 'green').length + (meta.servingSizeAmount && meta.servingSizeUnit ? 0 : 1),
      hint: 'Valores para revisar y porción sin cargar',
    },
    etiquetas: { n: meta.categoryId ? 0 : 1, hint: 'Falta la categoría' },
    mas: { n: 0, hint: '' },
  };

  // Octógonos que el decreto marca sin dudas con la tabla y la porción: se sugieren sobre la imagen.
  const decree = checkDecree({
    ingredients: [...detail.ingredients]
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((i) => `${i.variantName} | ${i.ingredientName}`),
    nutrition: detail.nutrition.map((n) => ({ name: n.name, value: n.value, unit: n.unit })),
    servingSizeAmount: meta.servingSizeAmount ? Number(meta.servingSizeAmount.replace(',', '.')) : null,
    servingSizeUnit: meta.servingSizeUnit || null,
    productName: meta.name,
  });
  const suggestedOctagons: Partial<Record<MspOctagon, boolean>> = {};
  for (const f of decree.findings) if (f.status === 'exceso') suggestedOctagons[OCTAGON_OF[f.key]] = true;

  const status = p.isRejected
    ? { text: 'Rechazado', cls: 'vw-status--rejected', title: 'No aparece en la cola ni en la app' }
    : p.isInspected
      ? { text: 'Validado', cls: 'vw-status--ok', title: `${validatedByText(p.validatedByEmail, p.validatedAt)}. Si cambiás algo, se guarda igual.` }
      : p.needsPhotos
        ? { text: `Faltan fotos · ${needsPhotosShort(p.needsPhotosParts)}`, cls: 'vw-status--pending', title: 'Esperando que un usuario saque las fotos' }
        : { text: 'Pendiente', cls: 'vw-status--pending', title: 'En la cola de validación' };

  const photoKey = TABS.find((t) => t.key === tab)!.photo;

  return (
    <AdminLayout className="page-validation">
      <div className="vw-container" style={{ '--vw-head': `${headH}px` } as React.CSSProperties}>

        {/* Ruta sobre el fondo de la página: es navegación, no parte del producto. Volver a la
            lista es este link ("Validación › producto"), no un botón. */}
        <nav className="vw-crumbs" aria-label="Ruta">
          <a href="/validation" className="vw-crumb-link" onClick={(e) => { e.preventDefault(); onBack(); }}>Validación</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          <span className="vw-crumb-here" aria-current="page">{meta.name || 'Sin nombre'}</span>
        </nav>

        {/* ── Encabezado de la página, sobre el fondo (sin tarjeta): producto, estado, acciones
            y pestañas. Queda fijo arriba al scrollear (debajo de la barra de guardado si está). */}
        <div className="vw-head" ref={headRef}>
          <div className="vw-head-row">
            {meta.image && !imageUrlInvalid
              ? <img src={meta.image} alt="" className="vw-head-thumb" />
              : (
                <div className="vw-head-thumb vw-head-thumb-empty" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
              )}

            <div className="vw-head-id">
              <div className="vw-head-title-row">
                <h1 className="vw-head-title" title={meta.name}>{meta.name || 'Sin nombre'}</h1>
                <span className={`vw-status ${status.cls}`} title={status.title}>{status.text}</span>
              </div>
              <div className="vw-head-sub">
                {meta.brand && <span>{meta.brand}</span>}
                {meta.barcode && <span className="is-num">Código {meta.barcode}</span>}
              </div>
            </div>

            {/* Jerarquía: Validar es el único primario; lo demás es secundario. */}
            <div className="vw-head-actions">
              {/* Mismo ícono de calculadora que "Calcular puntaje" en la tabla de productos. */}
              <Button
                variant="neutral"
                className={`vw-btn-ghost vw-btn-icon${showScore ? ' is-on' : ''}`}
                onClick={() => setShowScore((v) => !v)}
                aria-expanded={showScore}
                aria-label={showScore ? 'Ocultar puntaje' : 'Ver puntaje'}
                title={showScore ? 'Ocultar puntaje' : 'Ver puntaje'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="10" y2="10" />
                  <line x1="14" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="14" y1="14" x2="16" y2="14" />
                  <line x1="8" y1="18" x2="10" y2="18" />
                  <line x1="14" y1="18" x2="16" y2="18" />
                </svg>
              </Button>
              <div className="vw-menu-wrap" ref={menuRef}>
                <Button variant="outline" className="vw-btn-more" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
                  Más acciones
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </Button>
                {menuOpen && (
                  <div className="vw-menu" role="menu">
                    <button type="button" role="menuitem" className="vw-menu-item" onClick={openNeedsPhotos} disabled={busy}>
                      {p.needsPhotos ? 'Editar las fotos pedidas' : 'Pedir fotos que faltan'}
                    </button>
                    {p.isRejected
                      ? <button type="button" role="menuitem" className="vw-menu-item" onClick={onUnreject} disabled={busy}>Volver a la cola</button>
                      : <button type="button" role="menuitem" className="vw-menu-item is-danger" onClick={() => { setMenuOpen(false); setShowReject(true); }} disabled={busy}>Rechazar producto</button>}
                  </div>
                )}
              </div>
              {/* Siempre visible; se activa solo cuando hay cambios para guardar. */}
              <Button variant="outline" onClick={onSave} disabled={busy || !dirty}
                title={dirty ? 'Guarda los cambios y te quedás en la pantalla' : 'No hay cambios para guardar'}>
                Guardar
              </Button>
              <Button variant="primary" onClick={() => setShowValidate(true)} disabled={busy || !!p.isRejected}
                title={p.isRejected ? 'Para validarlo, primero volvelo a la cola' : 'Guarda, lo valida y vuelve a la lista'}>
                Validar
              </Button>
            </div>
          </div>

          {showScore && (
            <div className="vw-head-score">
              <ScorePreviewPanel
                productId={id}
                beforeCalc={saveMeta}
                isAlcoholic={meta.alcoholGraduation !== '' && Number(meta.alcoholGraduation) >= 0.5}
              />
            </div>
          )}

          <nav className="vw-tabs" aria-label="Secciones del producto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`vw-tab${tab === t.key ? ' is-on' : ''}`}
                aria-current={tab === t.key ? 'page' : undefined}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {pending[t.key].n > 0 && <span className="vw-tab-count" title={pending[t.key].hint}>{pending[t.key].n}</span>}
              </button>
            ))}
          </nav>
        </div>

        {error && <div className="vw-error" role="alert">{error}</div>}

        {/* Avisos de estado que piden una acción (los demás estados van en la etiqueta de arriba). */}
        {p.isRejected && (
          <div className="vw-needs-photos vw-rejected" role="status">
            <div>
              <strong>Rechazado</strong>{p.rejectedByEmail ? ` por ${p.rejectedByEmail}` : ''}{p.rejectedAt ? ` el ${new Date(p.rejectedAt).toLocaleDateString('es-UY')}` : ''}: no aparece en la cola ni en la app. Para validarlo, primero volvelo a la cola.
              {p.rejectedReason && <div style={{ marginTop: 4 }}>Motivo: {p.rejectedReason}</div>}
            </div>
            <Button variant="outline" size="small" onClick={onUnreject} disabled={busy}>Volver a la cola</Button>
          </div>
        )}

        {p.needsPhotos && (
          <div className="vw-needs-photos" role="status">
            <div>
              <strong>Esperando foto de {needsPhotosText(p.needsPhotosParts)}.</strong> El próximo usuario que lo escanee o lo busque tiene que sacarla; cuando llegue, la marca se quita sola y vuelve a la cola.
              {p.needsPhotosNote && <div style={{ marginTop: 4 }}>Nota: {p.needsPhotosNote}</div>}
            </div>
            <Button variant="outline" size="small" onClick={onClearNeedsPhotos} disabled={busy}>Quitar marca</Button>
          </div>
        )}

        {!!p.skippedLabelPhotos?.length && (
          <div className="vw-needs-photos vw-skipped-photos" role="note">
            <div>
              <strong>El envase no tiene {skippedPhotosText(p.skippedLabelPhotos)}</strong>, según quien lo cargó (salteó esa foto). No la pidas
              {p.skippedLabelPhotos.includes('nutritionFacts') ? ' y, si no hay tabla en ninguna fuente, dejala vacía (té, especias, sal, agua… no la llevan)' : ''}.
            </div>
          </div>
        )}

        {/* El contenido de la pestaña a la izquierda y la foto del envase a la derecha, para
            contrastar cada dato contra la etiqueta. El panel de fotos se monta una sola vez. */}
        <div className="vw-split">
          <div className="vw-split-main">
            {/* PORTADA */}
            {tab === 'portada' && (
              <div className="vw-card">
                <div className="vw-basics-row">
                  <label className="vw-photo-label">
                    {meta.image ? <img src={meta.image} alt="" className="vw-photo-img" />
                      : <div className="vw-photo-empty">Sin foto</div>}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
                    <div className="vw-photo-change">Cambiar foto</div>
                  </label>
                  <div style={{ flex: 1 }} className="vw-form-grid">
                    <div className="form-group form-group-full">
                      <Input label="Nombre" value={meta.name} onChange={(e) => set('name', e.target.value)} fullWidth />
                      <small className="vw-rule-hint">{NAME_RULE_HINT}</small>
                      {nameIssues.map((iss) => (
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
                      // Ofrecer las portadas que publican súper/marca por código de barras.
                      const fronts = (p.labelSources?.sources ?? [])
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
                            {fronts.length === 0 && p.labelSources?.fetchedAt && (
                              <span> Ya se buscó por código y ningún súper ni marca la tiene: buscala a mano (web de la marca, Google Imágenes) y pegá la URL abajo.</span>
                            )}
                            {fronts.length === 0 && !p.labelSources?.fetchedAt && (
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
                      <Input label="O pegá una URL de imagen" value={meta.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" fullWidth />
                      {imageUrlInvalid && (
                        <small className="form-hint" style={{ color: 'var(--color-error)' }}>
                          La URL debe comenzar con https:// (no se permite http:// por seguridad)
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INGREDIENTES (con la propuesta de la IA, que también propone los alérgenos) */}
            {tab === 'ingredientes' && (
              // La leyenda va dentro de la card para que ésta arranque a la misma altura que las fotos.
              <div className="vw-card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><Legend /></div>
                <CompositionStep part="ingredients" productId={id} detail={detail} busy={busy} setBusy={setBusy} onChanged={loadDetail} />
              </div>
            )}

            {/* ALÉRGENOS (contiene y puede contener) */}
            {tab === 'alergenos' && (
              <div className="vw-card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><Legend /></div>
                <CompositionStep part="allergens" productId={id} detail={detail} busy={busy} setBusy={setBusy} onChanged={loadDetail} />
              </div>
            )}

            {/* TABLA NUTRICIONAL (porción, tabla, octógonos y ultraprocesado) */}
            {tab === 'tabla' && (
              <div className="vw-card">
                <CompositionStep
                  part="nutrition"
                  productId={id}
                  detail={detail}
                  busy={busy}
                  setBusy={setBusy}
                  onChanged={loadDetail}
                  // La porción va pegada a la tabla porque se carga mirando la misma parte de la
                  // etiqueta. Es un dato de la ficha: se guarda con Guardar.
                  nutritionTop={
                    <div className="vp-portion">
                      <span className="vp-portion-label">Porción</span>
                      {/* Solo números (con coma o punto decimal): se descarta cualquier otra tecla. */}
                      <input
                        className="input vp-portion-amount"
                        type="text"
                        inputMode="decimal"
                        value={meta.servingSizeAmount}
                        onChange={(e) => {
                          if (/^\d*[.,]?\d*$/.test(e.target.value)) set('servingSizeAmount', e.target.value);
                        }}
                        placeholder="30"
                        aria-label="Porción (cantidad)"
                      />
                      {/* La base solo acepta g o ml (migración 138): sólido o líquido. */}
                      <select
                        className="input vp-portion-unit"
                        value={meta.servingSizeUnit}
                        onChange={(e) => set('servingSizeUnit', e.target.value)}
                        aria-label="Porción (unidad)"
                      >
                        <option value="">—</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                      </select>
                      <span className="vp-portion-hint">Como dice la etiqueta. Con ella se lleva la tabla a "por 100".</span>
                    </div>
                  }
                />
                <section className="vp-section">
                  <div className="vp-section-head">
                    <h3 className="vp-section-title">Octógonos (MSP)</h3>
                  </div>
                  <div className="vp-section-body">
                    {/* Se marcan tocando la imagen; los que el decreto da por seguros aparecen "Sugerido". */}
                    <div className="vw-octagons">
                      <OctagonPicker
                        values={{ sugar: meta.isSugarAlert, fat: meta.isFatAlert, saturatedFat: meta.isSaturatedFatAlert, sodium: meta.isSodiumAlert }}
                        onChange={(oid, v) => set(OCTAGON_FIELD[oid], v)}
                        suggested={suggestedOctagons}
                      />
                    </div>
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
                </section>
                <section className="vp-section">
                  <div className="vp-section-head">
                    <h3 className="vp-section-title">Ultraprocesado</h3>
                  </div>
                  <div className="vp-section-body">
                    <div className="vw-checks">
                      <Check label="Es ultraprocesado (NOVA 4)" hint={NOVA4_HINT} v={meta.isUltraProcessed} on={(v) => set('isUltraProcessed', v)} />
                    </div>
                    <NovaPanel
                      ingredientNames={detail.ingredients.map((i) => i.variantName || i.ingredientName)}
                      value={meta.isUltraProcessed}
                      onSet={(v) => set('isUltraProcessed', v)}
                    />
                  </div>
                </section>
              </div>
            )}

            {/* ETIQUETAS (categoría y etiquetas) */}
            {tab === 'etiquetas' && (
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
                    <label className="form-label" htmlFor="vw-category">Categoría</label>
                    <select id="vw-category" className="form-select" value={meta.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
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
                </div>
              </div>
            )}

            {/* MÁS DATOS (opcionales) */}
            {tab === 'mas' && (
              <div className="vw-card">
                <div className="vw-form-grid">
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
                  <label className="form-label">Empresas</label>
                  <ProductCompaniesSection
                    companies={companies as any}
                    loadingCompanies={false}
                    selectedCompanyIds={selectedCompanyIds}
                    onCompanySelect={onCompanySelect}
                  />
                </div>

                <div className="vw-form-grid" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="vw-source">Origen del dato</label>
                    <select id="vw-source" className="form-select" value={meta.source} onChange={(e) => set('source', e.target.value)}>
                      {SOURCES.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <Input label="Graduación alcohólica (% vol)" type="number" value={meta.alcoholGraduation} onChange={(e) => set('alcoholGraduation', e.target.value)} fullWidth />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="vw-split-aside">
            {/* Fotos arriba (se estiran) y, debajo, de dónde sacó cada dato el enriquecimiento IA. */}
            <div className="vw-split-aside-stack">
              {!!detail.scorePhotos?.length && <ScoreTablePhotos photos={detail.scorePhotos} onChanged={loadDetail} />}
              <SourceImagesPanel productId={id} initialKey={photoKey} />
              <div className="vw-photo-panel vw-ai-panel">
                <AiSourcesInfo
                  sources={p.enrichmentSources}
                  labelSources={p.labelSources}
                  brand={p.brand}
                  productId={id}
                  onChanged={loadDetail}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validar: confirma y ofrece el aviso a quien lo cargó. */}
      <Modal show={showValidate} title="Validar producto" onClose={() => !busy && setShowValidate(false)} maxWidth="520px">
        <div className="modal-body">
        <p className="vw-dialog-text">
          Se guardan los cambios y el producto sale de la cola: pasa a usar las tablas estructuradas y quien lo cargó recibe sus puntos.
          Los ingredientes sin validar siguen así hasta que alguien les cargue restricciones y atributos en Ingredientes.
        </p>
        {blindIngredients.length > 0 && (
          <div className="vw-blind" role="alert">
            <strong>Ojo: {blindIngredients.length === 1 ? 'este ingrediente no tiene' : 'estos ingredientes no tienen'} restricciones ni atributos.</strong>
            {' '}Ningún veredicto los ve: por ejemplo, si tiene leche o gluten, un alérgico o un celíaco recibiría APTO.
            Cargalos en Ingredientes antes de validar.
            <ul>{blindIngredients.map((i) => <li key={i.variantId}>{i.variantName || i.ingredientName}</li>)}</ul>
            <label className="vw-notify-check">
              <input type="checkbox" checked={validateAnyway} onChange={(e) => setValidateAnyway(e.target.checked)} />
              {' '}Ya lo revisé: validar igual (no lleva nada que choque con una restricción)
            </label>
          </div>
        )}
        <div className="vw-notify">
          {p.hasUploader === undefined ? null : !p.hasUploader ? (
            <span className="vw-notify-note">No lo cargó un usuario de la app: no hay a quién avisarle.</span>
          ) : p.approvalNotifiedAt ? (
            <span className="vw-notify-note">Ya se le avisó a quien lo cargó ({new Date(p.approvalNotifiedAt).toLocaleDateString('es-UY')}). No se vuelve a mandar.</span>
          ) : (
            <>
              <label className="vw-notify-check">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                {' '}Avisarle a quien lo cargó (una sola vez)
              </label>
              {notify && (
                <>
                  <textarea
                    className="vw-notify-msg"
                    value={notifyMessage}
                    maxLength={200}
                    rows={2}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    aria-label="Mensaje del aviso"
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
        <div className="vw-dialog-actions">
          <Button variant="outline" onClick={() => setShowValidate(false)} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={onValidate} disabled={busy || (blindIngredients.length > 0 && !validateAnyway)}>Validar</Button>
        </div>
        </div>
      </Modal>

      {/* Salir con cambios sin guardar. */}
      <Modal show={showLeave} title="Hay cambios sin guardar" onClose={() => !busy && setShowLeave(false)} maxWidth="520px">
        <div className="modal-body">
          <p className="vw-dialog-text">Si salís ahora se pierden los cambios de la ficha: nombre, porción, octógonos, categoría y demás.</p>
          <div className="vw-dialog-actions">
            <Button variant="outline" onClick={() => setShowLeave(false)} disabled={busy}>Seguir editando</Button>
            <Button variant="danger" onClick={() => navigate('/validation')} disabled={busy}>Salir sin guardar</Button>
            <Button variant="primary" onClick={onSaveAndLeave} disabled={busy}>Guardar y salir</Button>
          </div>
        </div>
      </Modal>

      {/* Pedir fotos que faltan. */}
      <Modal show={showNeedsPhotos} title={p.needsPhotos ? 'Editar las fotos pedidas' : 'Pedir fotos que faltan'} onClose={() => !busy && setShowNeedsPhotos(false)} maxWidth="560px">
        <div className="modal-body vw-needs-photos-form">
          <p className="vw-dialog-text" style={{ margin: 0 }}>
            Para cuando ninguna fuente deja validarlo (fotos chicas, lista cortada, sin tabla). Se guarda lo hecho y el próximo
            usuario que lo escanee o lo busque tiene que sacar las fotos que tildes; cuando lleguen, vuelve a la cola.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(['cover', 'nutrition', 'ingredients'] as NeedsPhotoPart[]).map((part) => (
              <label key={part} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={needsParts.includes(part)} onChange={() => toggleNeedsPart(part)} />
                {NEEDS_PHOTO_LABELS[part][0].toUpperCase() + NEEDS_PHOTO_LABELS[part].slice(1)}
                {skippedParts.includes(part) && <span style={{ fontSize: 12, color: 'var(--color-warning, #b45309)' }}>(el envase no la tiene, según quien lo cargó)</span>}
              </label>
            ))}
          </div>
          <label htmlFor="np-note"><strong>Nota</strong> (opcional, la ve quien valide después)</label>
          <textarea id="np-note" rows={2} maxLength={500} value={needsPhotosNote} onChange={(e) => setNeedsPhotosNote(e.target.value)}
            placeholder="Ej.: la lista de ingredientes está cortada y no hay foto de la tabla" />
          <div className="vw-dialog-actions" style={{ marginTop: 4 }}>
            <Button variant="outline" onClick={() => setShowNeedsPhotos(false)} disabled={busy}>Cancelar</Button>
            <Button variant="primary" onClick={onNeedsPhotos} disabled={busy || needsParts.length === 0}>
              {p.needsPhotos ? 'Guardar cambios' : `Pedir ${needsParts.length === 1 ? 'la foto' : 'las fotos'}`}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        show={showReject}
        title="¿Rechazar el producto?"
        message="Es para productos que no tienen sentido o están mal. Sale de la cola (se conserva el registro) y quien lo cargó NO recibe puntos."
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

/** Campo de meta que guarda cada octógono. */
const OCTAGON_FIELD: Record<MspOctagon, 'isSugarAlert' | 'isFatAlert' | 'isSaturatedFatAlert' | 'isSodiumAlert'> = {
  sugar: 'isSugarAlert',
  fat: 'isFatAlert',
  saturatedFat: 'isSaturatedFatAlert',
  sodium: 'isSodiumAlert',
};
/** Al revés: el octógono de cada hallazgo del decreto. */
const OCTAGON_OF: Record<DecreeKey, MspOctagon> = {
  isSugarAlert: 'sugar',
  isFatAlert: 'fat',
  isSaturatedFatAlert: 'saturatedFat',
  isSodiumAlert: 'sodium',
};

function Check({ label, v, on, hint }: { label: string; v: boolean; on: (v: boolean) => void; hint?: string }) {
  return <label className="vw-check" title={hint}><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}</label>;
}
