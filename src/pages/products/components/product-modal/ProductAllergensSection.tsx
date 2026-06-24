import { useState } from 'react';
import type { Allergen } from './types';
import type { ProductAllergen, AllergenPresence } from '../../types';
import { ALLERGEN_PRESENCE_LABELS } from '../../types';
import { Input } from '../../../../components/ui';
import { matchesSearch } from '../../../../utils/search';

interface ProductAllergensSectionProps {
  allergenData: ProductAllergen[];
  allAllergens: Allergen[];
  loadingAllergens: boolean;
  onAllergenToggle: (allergenId: string, allergenName: string) => void;
  onPresenceChange: (allergenId: string, presence: AllergenPresence) => void;
}

export function ProductAllergensSection({
  allergenData,
  allAllergens,
  loadingAllergens,
  onAllergenToggle,
  onPresenceChange,
}: ProductAllergensSectionProps) {
  const [searchAllergen, setSearchAllergen] = useState('');

  const filteredAllergens = allAllergens.filter(a =>
    matchesSearch(a.name, searchAllergen)
  );

  return (
    <div className="form-group form-group-full allergen-section">
      <label className="section-label">Alérgenos</label>
      <div className="ingredients-search">
        <Input
          type="text"
          placeholder="Buscar alérgeno..."
          value={searchAllergen}
          onChange={(e) => setSearchAllergen(e.target.value)}
          fullWidth
        />
        <small className="form-hint">
          {allergenData.length} alérgeno(s) seleccionado(s)
        </small>
      </div>
      {loadingAllergens ? (
        <div className="ingredients-loading">
          <div className="spinner"></div>
          <p>Cargando alérgenos...</p>
        </div>
      ) : (
        <div className="ingredients-list" style={{ maxHeight: '260px' }}>
          {filteredAllergens
            .sort((a, b) => {
              const aSelected = allergenData.some(pa => pa.allergenId === a.id) ? 0 : 1;
              const bSelected = allergenData.some(pa => pa.allergenId === b.id) ? 0 : 1;
              return aSelected - bSelected;
            })
            .map(allergen => {
              const selected = allergenData.find(pa => pa.allergenId === allergen.id);
              return (
                <label key={allergen.id} className="ingredient-item">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => onAllergenToggle(allergen.id, allergen.name)}
                  />
                  <div className="ingredient-info">
                    <span className="ingredient-name">{allergen.name}</span>
                    {selected && (
                      <select
                        className="select allergen-presence-select"
                        value={selected.presence}
                        onChange={(e) => onPresenceChange(allergen.id, e.target.value as AllergenPresence)}
                      >
                        {Object.entries(ALLERGEN_PRESENCE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              );
            })}
          {filteredAllergens.length === 0 && (
            <div className="no-ingredients">
              No se encontraron alérgenos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
