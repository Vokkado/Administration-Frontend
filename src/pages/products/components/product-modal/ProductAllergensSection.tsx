/**
 * Selección de alérgenos del producto, en dos paneles.
 *
 * Izquierda: los elegidos, con su presencia y el botón de quitar. Derecha: el buscador y
 * el catálogo completo. Con una sola lista, los seleccionados se perdían entre decenas de
 * opciones y había que confiar en el orden para encontrarlos.
 *
 * La presencia va como control segmentado y NO como <select>: con dos opciones, un
 * desplegable obliga a dos clicks y esconde el valor que no está elegido. Además queda
 * FUERA del <label> del checkbox; adentro, clickearlo desmarcaba el alérgeno que se
 * estaba editando.
 */
import { useState } from 'react';
import type { Allergen } from './types';
import type { ProductAllergen, AllergenPresence } from '../../types';
import { Input } from '../../../../components/ui';
import { matchesSearch } from '../../../../utils/search';

interface ProductAllergensSectionProps {
  allergenData: ProductAllergen[];
  allAllergens: Allergen[];
  loadingAllergens: boolean;
  onAllergenToggle: (allergenId: string, allergenName: string) => void;
  onPresenceChange: (allergenId: string, presence: AllergenPresence) => void;
}

const PRESENCE_OPTIONS: Array<{ value: AllergenPresence; label: string; title: string }> = [
  { value: 'CONTAINS', label: 'Contiene', title: 'El alérgeno es un ingrediente del producto' },
  { value: 'MAY_CONTAIN', label: 'Puede contener', title: 'Trazas por contaminación cruzada' },
];

export function ProductAllergensSection({
  allergenData,
  allAllergens,
  loadingAllergens,
  onAllergenToggle,
  onPresenceChange,
}: ProductAllergensSectionProps) {
  const [searchAllergen, setSearchAllergen] = useState('');

  const selectedIds = new Set(allergenData.map((pa) => pa.allergenId));
  // El nombre se toma del catálogo; `allergenData` puede venir del backend sin él.
  const nameById = new Map(allAllergens.map((a) => [a.id, a.name]));
  const options = allAllergens.filter((a) => matchesSearch(a.name, searchAllergen));

  return (
    <div className="form-group form-group-full modal-picker">
      <div className="mp-split">
        {/* ── Elegidos ─────────────────────────────────────────────────── */}
        <section className="mp-panel">
          <header className="mp-panel-head">
            <span className="mp-panel-title">Alérgenos del producto</span>
            <span className="mp-count">{allergenData.length}</span>
          </header>

          {allergenData.length === 0 ? (
            <p className="mp-empty">
              Todavía no elegiste ninguno. Buscalos en la lista de la derecha.
            </p>
          ) : (
            <ul className="mp-selected-list">
              {allergenData.map((item) => {
                const name = nameById.get(item.allergenId) ?? item.name ?? 'Alérgeno';
                return (
                  <li key={item.allergenId} className="mp-selected-item">
                    <span className="mp-name" title={name}>{name}</span>

                    <div className="mp-presence" role="group" aria-label={`Presencia de ${name}`}>
                      {PRESENCE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          title={option.title}
                          className={`mp-presence-btn${item.presence === option.value ? ' is-active' : ''}`}
                          onClick={() => onPresenceChange(item.allergenId, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="mp-remove"
                      title="Quitar del producto"
                      aria-label={`Quitar ${name}`}
                      onClick={() => onAllergenToggle(item.allergenId, name)}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Catálogo ─────────────────────────────────────────────────── */}
        <section className="mp-panel">
          <header className="mp-panel-head">
            <span className="mp-panel-title">Agregar alérgeno</span>
          </header>

          <Input
            type="text"
            placeholder="Buscar alérgeno..."
            value={searchAllergen}
            onChange={(e) => setSearchAllergen(e.target.value)}
            fullWidth
          />

          {loadingAllergens ? (
            <div className="ingredients-loading">
              <div className="spinner"></div>
              <p>Cargando alérgenos...</p>
            </div>
          ) : (
            <div className="mp-options">
              {options.map((allergen) => (
                <label
                  key={allergen.id}
                  className={`mp-option${selectedIds.has(allergen.id) ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(allergen.id)}
                    onChange={() => onAllergenToggle(allergen.id, allergen.name)}
                  />
                  <span className="mp-name" title={allergen.name}>{allergen.name}</span>
                </label>
              ))}

              {options.length === 0 && (
                <p className="mp-empty">No se encontraron alérgenos</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
