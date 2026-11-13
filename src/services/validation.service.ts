/**
 * Validation API service (Admin) — cola "Validar productos".
 */
import { apiService } from './api.service';

export type LinkColor = 'green' | 'yellow' | 'red';

export interface ValidationQueueItem {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  barcode: string | null;
  createdAt: string;
  /** Última modificación: para un producto enriquecido, cuándo se completó. */
  updatedAt: string;
  counts: { green: number; yellow: number; red: number };
  /** "Info insuficiente": marcado en el wizard; espera que un usuario saque las 3 fotos. */
  needsPhotos?: boolean;
  needsPhotosNote?: string | null;
  needsPhotosParts?: NeedsPhotoPart[] | null;
  /** Rechazado: solo aparece con el filtro "Rechazados". */
  isRejected?: boolean;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  rejectedByEmail?: string | null;
  /** Quién lo validó y cuándo (filtro "Validados"). */
  validatedAt?: string | null;
  validatedByEmail?: string | null;
}

export interface ValidationIngredient {
  variantId: string;
  variantName: string;
  ingredientId: string;
  ingredientName: string;
  position: number | null;
  matchTier: string | null;
  linkInspected: boolean;
  ingredientInspected: boolean;
  /** La IA creó el ingrediente al cargar un producto (rojo si además nadie lo validó). */
  ingredientCreatedByAi?: boolean;
  score: number | null;
  toxicityLevel: string | null;
  reason: string | null;
  isNutritive: boolean;
  color: LinkColor;
  /**
   * Atributos automáticos de la variante (Metas, Embarazo…). `inspected` false = los puso la IA o
   * el clasificador y nadie los validó; se validan en la pantalla del ingrediente (aprobar el producto no).
   */
  autoAttributes?: ValidationAutoAttribute[];
}

export interface ValidationAutoAttribute {
  attributeId: string;
  attributeName: string;
  typeName: string;
  inspected: boolean;
}

export interface ValidationAllergen {
  allergenId: string;
  allergenName: string;
  presence: string | null;
  matchTier: string | null;
  color: LinkColor;
}

export interface ValidationNutrition {
  nutritionFactId: string;
  name: string;
  value: number | null;
  unit: string | null;
  matchTier: string | null;
  color: LinkColor;
}

/** Qué súper/fuente aportó qué campo durante el enriquecimiento IA. Ver Backend aiResultToProductUpdate.ts. */
export interface EnrichmentSourceSummary {
  store: string;
  url: string | null;
  usedCover: boolean;
  usedNutritionText: boolean;
  usedIngredientsText: boolean;
  galleryCount: number;
}

export interface ValidationProduct {
  id: string; name: string; brand: string | null; image: string | null; barcode: string | null;
  rawIngredients: string | null; rawNutritionFacts: any; rawAllergens: string | null;
  isInspected?: boolean;
  categoryId: string | null; registrationName: string | null; registrationCode: string | null;
  legalName: string | null; alcoholGraduation: number | null; source: string | null;
  isUltraProcessed: boolean | null;
  isFatAlert: boolean | null; isSaturatedFatAlert: boolean | null; isSugarAlert: boolean | null; isSodiumAlert: boolean | null;
  /** Sellos frontales de otros países que trae el envase (hoy AR). Los de UY son los is_*_alert. */
  frontSeals?: Record<string, string[]> | null;
  /** Lo cargó un usuario de la app (hay a quién avisarle al validar). */
  hasUploader?: boolean;
  /** Cuándo se le avisó que su producto fue validado (una sola vez). */
  approvalNotifiedAt?: string | null;
  servingSizeAmount: number | null; servingSizeUnit: string | null;
  /** null = no pasó por enriquecimiento IA (foto de portada solo, o cargado a mano). */
  enrichmentSources: EnrichmentSourceSummary[] | null;
  /** Fotos y textos de cada fuente, guardados (botón "Traer fotos y textos" o "Completar con IA"). */
  labelSources?: LabelSources | null;
  /** Lo último que propuso "Completar con IA (Beta)". */
  aiCompositionDraft?: AiCompositionDraft | null;
  needsPhotos?: boolean;
  needsPhotosNote?: string | null;
  needsPhotosAt?: string | null;
  needsPhotosParts?: NeedsPhotoPart[] | null;
  isRejected?: boolean;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  rejectedByEmail?: string | null;
  validatedAt?: string | null;
  validatedByEmail?: string | null;
}

/** Fotos que se pueden pedir con "Falta información". */
export type NeedsPhotoPart = 'cover' | 'nutrition' | 'ingredients';
export const NEEDS_PHOTO_LABELS: Record<NeedsPhotoPart, string> = { cover: 'portada', nutrition: 'tabla nutricional', ingredients: 'ingredientes' };
/** Para etiquetas: "Ingredientes", "Tabla · Ingredientes"… (vacío = las 3). */
export function needsPhotosShort(parts?: NeedsPhotoPart[] | null): string {
  const short: Record<NeedsPhotoPart, string> = { cover: "Portada", nutrition: "Tabla", ingredients: "Ingredientes" };
  return (parts?.length ? parts : (["cover", "nutrition", "ingredients"] as NeedsPhotoPart[])).map((p) => short[p]).join(" · ");
}

/** "ingredientes", "tabla nutricional e ingredientes"… (vacío = las 3). */
export function needsPhotosText(parts?: NeedsPhotoPart[] | null): string {
  const list = (parts?.length ? parts : (['cover', 'nutrition', 'ingredients'] as NeedsPhotoPart[])).map((p) => NEEDS_PHOTO_LABELS[p]);
  return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

export interface LabelSource {
  store: string; url: string | null; name: string | null;
  coverUrl: string | null; labelImageUrls: string[];
  ingredientsText: string | null; nutritionText: string | null;
  /** true = el súper devolvió este código de barras; false = solo por nombre (puede ser otro producto). */
  matchedByEan?: boolean;
}
export interface ScoreHighlightItem { name: string; valuePer100: number; unit: string }
/** Respuesta de "Ver posible puntaje" (mismo motor que el puntaje real, sin guardar). */
export interface ScorePreview {
  score: number | null;
  highlights: {
    beneficials: ScoreHighlightItem[]; notBeneficials: ScoreHighlightItem[]; excesses: ScoreHighlightItem[];
    neutrals: ScoreHighlightItem[]; neutralExcesses: ScoreHighlightItem[];
  } | null;
  breakdown: {
    scoreFinal: number | null;
    penaltyIngredientes: number; penaltyToxicidad: number; penaltyRedFlags: number;
    nutritionNegativeImpact: number; nutritionPositiveImpact: number; penaltyUltraProcessed: number;
    penaltyPobrezaNutricional: number; penaltyAmortiguacion: number;
  };
}

export interface LabelSources {
  fetchedAt: string;
  userPhotos: { cover: string | null; ingredients: string | null; nutritionFacts: string | null };
  sources: LabelSource[];
}

export interface AiProposedIngredient {
  labelText: string; variantId: string | null; variantName: string | null; ingredientName: string | null;
  validated: boolean; status: 'igual' | 'nuevo' | 'crear'; newVariant: string | null;
  confidence: 'alta' | 'media' | 'baja'; reason: string;
}
export interface AiProposal {
  ingredients: AiProposedIngredient[];
  removeIngredients: { variantId: string; variantName: string }[];
  allergens: { allergenId: string; name: string; presence: 'CONTAINS' | 'MAY_CONTAIN'; status: 'igual' | 'nuevo' | 'cambia' }[];
  removeAllergens: { allergenId: string; name: string }[];
  nutrition: { nutritionFactId: string | null; name: string; value: number | null; unit: string | null; unitWarning?: string; suspect?: string; current: { value: number | null; unit: string | null } | null; status: 'igual' | 'cambia' | 'nuevo' | 'falta en catálogo' }[];
  removeNutrition: { nutritionFactId: string; name: string }[];
  portion: { amount: number | null; unit: string | null; basis: string | null; current: { amount: number | null; unit: string | null } };
  doubts: string[];
  sourceUsed: string;
  labelReadable: boolean;
}
export interface AiCompositionDraft {
  proposal?: AiProposal;
  usage: { step: string; promptTokens: number; completionTokens: number; model: string; ms: number }[];
  updatedAt: string;
}

export interface ValidationCompany {
  companyId: string;
  companyName: string;
  role: string;
}

export interface CategorySuggestion {
  match: { categoryId: string; categoryName: string; confidence: 'HIGH' | 'MEDIUM' } | null;
  proposal: { name: string; parentId: string | null; parentName: string | null } | null;
}

export interface ValidationTag {
  tagId: string;
  tagName: string;
  tagGroupId: string;
  tagGroupName: string;
  isInspected: boolean;
  source: 'ai' | 'admin';
  color: LinkColor;
}

export interface ValidationDetail {
  product: ValidationProduct;
  ingredients: ValidationIngredient[];
  allergens: ValidationAllergen[];
  nutrition: ValidationNutrition[];
  companies: ValidationCompany[];
  tags: ValidationTag[];
}

export interface CategoryOption { id: string; name: string }
export interface CompanyOption { id: string; name: string }

const BASE = '/products/validation';

export class ValidationService {
  static async getQueue(
    limit = 30,
    offset = 0,
    search?: string,
    /** Default en el backend: createdAt desc (más nuevos primero). */
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'links' | 'validatedAt',
    sortDir?: 'asc' | 'desc',
    /** true = solo "info insuficiente"; false = sin esa marca; undefined = todos. */
    needsPhotos?: boolean,
    /** true = solo los rechazados (para revisarlos o devolverlos a la cola). */
    rejected?: boolean,
    /** true = los ya validados (quién y cuándo). */
    validated?: boolean,
  ): Promise<{ items: ValidationQueueItem[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (rejected) params.append('rejected', 'true');
    if (validated) params.append('validated', 'true');
    if (needsPhotos !== undefined) params.append('needsPhotos', String(needsPhotos));
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortDir) params.append('sortDir', sortDir);
    const res = await apiService.get<any>(`${BASE}/queue?${params.toString()}`);
    return res.data ?? { items: [], total: 0 };
  }

  /** Completar con IA (Beta): 1) fuentes, 2) leer etiqueta, 3) elegir del catálogo. Solo propone. */
  static async aiSources(id: string): Promise<LabelSources> {
    const res = await apiService.post<{ success: boolean; data: LabelSources }>(`${BASE}/${id}/ai/sources`, {});
    return res.data;
  }
  static async aiOrient(id: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/ai/orient`, {});
  }
  static async aiExtract(id: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/ai/extract`, {});
  }
  static async aiMap(id: string): Promise<AiProposal> {
    const res = await apiService.post<{ success: boolean; data: AiProposal }>(`${BASE}/${id}/ai/map`, {});
    return res.data;
  }

  static async getDetail(id: string): Promise<ValidationDetail> {
    const res = await apiService.get<any>(`${BASE}/${id}`);
    return res.data;
  }

  /** "Falta información: pedir fotos" (el producto sigue pendiente). */
  static async setNeedsPhotos(id: string, note?: string, parts?: NeedsPhotoPart[]): Promise<void> {
    await apiService.post(`${BASE}/${id}/needs-photos`, { note: note || null, parts: parts ?? null });
  }
  static async clearNeedsPhotos(id: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/needs-photos`);
  }

  /** Puntaje estimado con lo cargado hasta ahora (no guarda nada). */
  static async previewScore(id: string): Promise<ScorePreview> {
    const res = await apiService.get<{ data: ScorePreview }>(`${BASE}/${id}/score-preview`);
    return res.data;
  }

  /** Valida. notifyUploader (por defecto true) le manda un push a quien lo cargó, una sola vez. */
  static async approve(id: string, opts: { notifyUploader?: boolean; notifyMessage?: string } = {}): Promise<{ notification?: string }> {
    const res: any = await apiService.post(`${BASE}/${id}/approve`, opts);
    return res?.data?.data ?? res?.data ?? {};
  }

  /** Descarta (soft-reject) el producto: lo marca rechazado, no otorga puntos al uploader. */
  static async reject(id: string, reason?: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/reject`, reason ? { reason } : {});
  }

  /** Deshace el rechazo: el producto vuelve a la cola como pendiente. */
  static async unreject(id: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/unreject`, {});
  }

  static async confirmIngredient(id: string, variantId: string): Promise<void> {
    await apiService.patch(`${BASE}/${id}/ingredient/${variantId}/confirm`);
  }

  static async removeIngredient(id: string, variantId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/ingredient/${variantId}`);
  }

  static async reassignIngredient(id: string, oldVariantId: string, newVariantId: string): Promise<void> {
    await apiService.put(`${BASE}/${id}/ingredient/reassign`, { oldVariantId, newVariantId });
  }

  /** Guarda el orden de la etiqueta: todas las variantes vinculadas, de la primera a la última. */
  static async reorderIngredients(id: string, variantIds: string[]): Promise<void> {
    await apiService.put(`${BASE}/${id}/ingredients/order`, { variantIds });
  }

  static async validateIngredient(
    ingredientId: string,
    edits?: { score?: number; toxicityLevel?: string; reason?: string; isNutritive?: boolean },
  ): Promise<void> {
    await apiService.patch(`${BASE}/ingredient/${ingredientId}/validate`, edits ?? {});
  }

  // ── Edición directa ────────────────────────────────────────────────────────
  static async updateBasics(id: string, data: { name?: string; brand?: string | null; image?: string | null }): Promise<void> {
    await apiService.patch(`${BASE}/${id}/product`, data);
  }
  /** Edita campos escalares (básicos + registro/categoría/alcohol/serving/alertas). */
  static async updateMeta(id: string, data: Record<string, any>): Promise<void> {
    await apiService.patch(`${BASE}/${id}/meta`, data);
  }
  /**
   * Categoría que propone la IA (una llamada a la IA, no guarda nada): una de la lista (`match`) o,
   * si ninguna encaja, una nueva con la sección donde iría (`proposal`). Los dos null = no está segura.
   */
  static async suggestCategory(id: string): Promise<CategorySuggestion> {
    const res = await apiService.post<any>(`${BASE}/${id}/suggest-category`, {});
    return { match: res.data?.match ?? null, proposal: res.data?.proposal ?? null };
  }
  /** Crea una categoría asignable (la que propuso la IA y aceptó el admin). */
  static async createCategory(data: { name: string; parentCategoryId: string | null }): Promise<CategoryOption> {
    const res = await apiService.post<any>('/categories', data);
    return { id: res.data.id, name: res.data.name };
  }
  static async getCategories(): Promise<CategoryOption[]> {
    const res = await apiService.get<any>('/categories');
    return (res.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
  }
  static async getCompanies(): Promise<CompanyOption[]> {
    const res = await apiService.get<any>('/companies');
    return (res.data ?? []).map((c: any) => ({ id: c.id, name: c.name }));
  }
  static async addIngredient(id: string, variantId: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/ingredient`, { variantId });
  }
  static async addAllergen(id: string, allergenId: string, presence: 'CONTAINS' | 'MAY_CONTAIN' = 'CONTAINS'): Promise<void> {
    await apiService.post(`${BASE}/${id}/allergen`, { allergenId, presence });
  }
  static async removeAllergen(id: string, allergenId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/allergen/${allergenId}`);
  }
  static async addTag(id: string, tagId: string): Promise<void> {
    await apiService.post(`${BASE}/${id}/tag`, { tagId });
  }
  static async removeTag(id: string, tagId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/tag/${tagId}`);
  }
  static async upsertNutrition(id: string, nutritionFactId: string, value: number, unit: string | null): Promise<void> {
    await apiService.post(`${BASE}/${id}/nutrition`, { nutritionFactId, value, unit });
  }
  static async removeNutrition(id: string, nutritionFactId: string): Promise<void> {
    await apiService.delete(`${BASE}/${id}/nutrition/${nutritionFactId}`);
  }

  /** Sube una imagen (file → base64) al bucket y devuelve la URL pública. */
  static async uploadImage(file: File): Promise<string> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await apiService.post<any>('/products/cover-image', { imageBase64: dataUrl, contentType: file.type });
    return res.data.url;
  }
}
