/**
 * Pestaña "Tags" del editor de productos: los mismos componentes que el paso "Más info" del wizard
 * de validación (lista de tags por grupo + "✨ Sugerir con IA"). Los tags se guardan al momento
 * (no esperan a "Guardar cambios"), igual que en el wizard. La categoría que proponga la IA se
 * aplica al formulario y sí se guarda con "Guardar cambios".
 */
import { useCallback, useEffect, useState } from 'react';
import { AiSuggestPanel, TagsSection } from '../../../validation/composition';
import { TagsService } from '../../../../services/tags.service';
import type { ValidationTag } from '../../../../services/validation.service';
import '../../../validation/composition.css';

export function ProductTagsSection({ productId, categoryId, onUseCategory, onCategoryCreated }: {
  productId: string;
  categoryId: string;
  onUseCategory: (categoryId: string) => void;
  onCategoryCreated: (category: { id: string; name: string; parentId: string | null }) => void;
}) {
  const [tags, setTags] = useState<ValidationTag[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const links = await TagsService.getProductTags(productId);
    setTags(links.map((l) => ({ ...l, color: l.isInspected ? 'green' : 'red' })));
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AiSuggestPanel
        productId={productId}
        categoryId={categoryId}
        linkedTagIds={tags.map((t) => t.tagId)}
        busy={busy}
        setBusy={setBusy}
        onUseCategory={onUseCategory}
        onCategoryCreated={onCategoryCreated}
        onChanged={load}
      />
      <TagsSection
        productId={productId}
        categoryId={categoryId}
        tags={tags}
        busy={busy}
        setBusy={setBusy}
        onChanged={load}
      />
    </div>
  );
}
