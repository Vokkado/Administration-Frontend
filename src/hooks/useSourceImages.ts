/**
 * Carga las fotos originales que subió el usuario al dar de alta un producto por IA
 * (portada / ingredientes / información nutricional) y quién lo cargó.
 *
 * Devuelve `photos` ya filtrado: solo las que existen y no fallaron al renderizar, así los
 * índices coinciden con lo que se muestra en pantalla (importante para el lightbox con flechas).
 */
import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api.service';

export interface SourceImages {
  cover: string | null;
  ingredients: string | null;
  nutritionFacts: string | null;
  uploader: { id: string; email: string } | null;
}

export const SOURCE_PHOTOS = [
  { key: 'cover', label: 'Portada', short: 'Portada' },
  { key: 'ingredients', label: 'Ingredientes', short: 'Ingredientes' },
  { key: 'nutritionFacts', label: 'Información nutricional', short: 'Nutricional' },
] as const;

export type SourcePhotoKey = (typeof SOURCE_PHOTOS)[number]['key'];

export interface SourcePhoto {
  key: SourcePhotoKey;
  label: string;
  short: string;
  url: string;
}

export function useSourceImages(productId?: string) {
  // El productId viaja junto al resultado: así se descarta la data vieja sin un setState de reset.
  const [loaded, setLoaded] = useState<{ productId: string; images: SourceImages | null }>({
    productId: '',
    images: null,
  });
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!productId) return;
    let active = true;
    apiService
      .get<{ success: boolean; data: SourceImages }>(`/products/${productId}/source-images`)
      .then((resp) => { if (active) { setLoaded({ productId, images: resp.data }); setFailed({}); } })
      .catch(() => { if (active) { setLoaded({ productId, images: null }); setFailed({}); } });
    return () => { active = false; };
  }, [productId]);

  const markFailed = useCallback((key: string) => setFailed((f) => ({ ...f, [key]: true })), []);

  const images = productId && loaded.productId === productId ? loaded.images : null;
  const photos: SourcePhoto[] = images
    ? SOURCE_PHOTOS.flatMap((p) => {
        const url = images[p.key];
        return url && !failed[p.key] ? [{ key: p.key, label: p.label, short: p.short, url }] : [];
      })
    : [];

  return { images, photos, uploader: images?.uploader ?? null, markFailed };
}
