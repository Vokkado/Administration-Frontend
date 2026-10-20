/**
 * Filtro de origen de ingredientes / variantes (arriba de la tabla, porque por defecto oculta algo).
 *
 * - Aprobados por personas (por defecto): los cargó una persona, o los creó la IA y alguien ya los
 *   aprobó (validarlos acá, o aprobar en "Validar productos" un producto que los usa).
 * - Generados por IA: los creó la IA al cargar un producto y nadie los aprobó todavía. Lo normal es
 *   aprobarlos desde el producto, no uno por uno acá.
 * - Todos.
 *
 * El filtro "Validado" de la columna se combina con este.
 */
import { FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';
import type { CatalogOrigin } from '../types';

export type OriginFilterValue = CatalogOrigin | 'ALL';

const OPTIONS: FilterOption[] = [
  { value: 'HUMAN', label: 'Aprobados por personas' },
  { value: 'AI', label: 'Generados por IA' },
  { value: 'ALL', label: 'Todos' },
];

interface OriginFilterProps {
  value: OriginFilterValue;
  onChange: (value: OriginFilterValue) => void;
  /** "ingredientes" / "variantes", para el texto de ayuda. */
  noun: string;
}

export function OriginFilter({ value, onChange, noun }: OriginFilterProps) {
  return (
    <div className="origin-filter">
      <FilterButtonGroup options={OPTIONS} value={value} onChange={(v) => onChange(v as OriginFilterValue)} />
      {value === 'AI' && (
        <small className="origin-filter-hint">
          Los creó la IA al cargar productos y nadie los aprobó todavía. Al aprobar el producto en "Validar productos",
          sus {noun} pasan a "Aprobados por personas".
        </small>
      )}
    </div>
  );
}
