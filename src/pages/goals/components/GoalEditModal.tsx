/**
 * Editar una meta: textos que ve el usuario, ícono, orden, umbrales y qué atributos cuentan para cada
 * rol ("Fuentes de azúcar" ← Metas › Azúcares…), igual que se vinculan atributos a una restricción.
 *
 * El código interno y la lógica no se editan (viven en el código). Los umbrales tienen el rango que
 * permite el código; se valida acá para avisar antes de guardar y el backend vuelve a validar.
 */
import { useMemo, useState } from 'react';
import { Button, Input, Modal, StatusBadge } from '../../../components/ui';
import { AdminOnly } from '../../../components/routing/AdminOnly';
import type { AdminGoal, AdminGoalsView, GoalAttributeRole, GoalParamSpec, UpdateGoalInput } from '../../../services/goals.service';
import type { AttributeOption } from '../../../hooks/useAttributeOptions';
import { AttributePicker } from './AttributePicker';
import { IoLockClosedOutline } from 'react-icons/io5';
import { GoalIcon } from '../goalIcons';
import { NOVA4_HINT } from '../../../constants/nova';
import {
  describeUses,
  displayCode,
  fmtNumber,
  fromDraft,
  hasErrors,
  paramsChanged,
  toDraft,
  validateDraft,
  type ParamDraft,
} from '../goalFormat';

interface GoalEditModalProps {
  goal: AdminGoal | null;
  view: AdminGoalsView;
  /** Todos los atributos, para vincular a los roles de la meta. */
  attributeOptions: AttributeOption[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (code: string, input: UpdateGoalInput) => void;
  /** Ver los cambios anteriores de la meta. */
  onHistory: (goal: AdminGoal) => void;
  /** Activar / desactivar (solo admin: el botón no se muestra a otros roles). */
  onToggleActive: (goal: AdminGoal) => void;
}

export function GoalEditModal(props: GoalEditModalProps) {
  // Se monta de nuevo por cada meta (key): el formulario arranca con sus valores.
  return props.goal ? <GoalEditForm key={props.goal.code} {...props} goal={props.goal} /> : null;
}

type RoleDraft = Partial<Record<GoalAttributeRole, string[]>>;

const roleDraftOf = (goal: AdminGoal): RoleDraft =>
  Object.fromEntries(goal.roles.map((r) => [r.role, r.attributes.map((a) => a.id)]));

const sameIds = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));

function GoalEditForm({ goal, view, attributeOptions, saving, error, onClose, onSave, onHistory, onToggleActive }: GoalEditModalProps & { goal: AdminGoal }) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description);
  const [icon, setIcon] = useState(goal.icon);
  const [sortOrder, setSortOrder] = useState(String(goal.sortOrder));
  const [draft, setDraft] = useState<ParamDraft>(() => toDraft(goal));
  const [roles, setRoles] = useState<RoleDraft>(() => roleDraftOf(goal));
  const [touched, setTouched] = useState(false);

  const values = useMemo(() => fromDraft(goal.paramSpecs, draft), [goal, draft]);
  const paramErrors = useMemo(() => validateDraft(goal, values), [goal, values]);

  const order = Number(sortOrder);
  const textErrors = [
    name.trim().length < 2 || name.trim().length > 80 ? 'El nombre debe tener entre 2 y 80 caracteres' : '',
    description.trim().length < 10 || description.trim().length > 400 ? 'La descripción debe tener entre 10 y 400 caracteres' : '',
    !Number.isInteger(order) || order < 0 || order > 99 ? 'El orden debe ser un entero entre 0 y 99' : '',
  ].filter(Boolean);
  const invalid = textErrors.length > 0 || hasErrors(paramErrors);
  const thresholdsChanged = !hasErrors(paramErrors) && paramsChanged(goal, values);
  const rolesChanged = goal.roles.some((r) => !sameIds(roles[r.role], r.attributes.map((a) => a.id)));
  // Nombres de lo ya vinculado, por si la lista de atributos todavía no cargó.
  const fallbackNames = useMemo(
    () => Object.fromEntries(goal.roles.flatMap((r) => r.attributes.map((a) => [a.id, a.name]))),
    [goal],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSave(goal.code, {
      name: name.trim(),
      description: description.trim(),
      icon,
      sortOrder: order,
      params: values,
      // Solo si cambiaron: así guardar textos no reescribe los vínculos.
      ...(rolesChanged ? { attributes: roles } : {}),
    });
  };

  const setField = (key: string, basis: 'g' | 'ml' | null, text: string) => {
    setDraft((prev) => {
      const current = prev[key];
      if (basis === null || typeof current === 'string') return { ...prev, [key]: text };
      return { ...prev, [key]: { ...current, [basis]: text } };
    });
  };

  return (
    <Modal show title={`Editar meta: ${goal.name}`} onClose={onClose} error={error} maxWidth="1100px" className="page-goals">
      <div className="modal-body">
        <form className="modal-form" id="goal-form" onSubmit={submit} noValidate>
          <div className="modal-form-columns goal-edit-columns">
            <div className="modal-form-left">
              <h3 className="modal-column-title">Información básica</h3>

              <div className="goal-summary">
                <div className="goal-summary-row">
                  <StatusBadge variant={goal.isActive ? 'active' : 'inactive'}>
                    {goal.isActive ? 'Activa' : 'Inactiva'}
                  </StatusBadge>
                  <span className="goal-summary-users">
                    {goal.usersCount === 1 ? '1 usuario la eligió' : `${goal.usersCount} usuarios la eligieron`}
                  </span>
                </div>
                <div className="goal-summary-uses">
                  <span className="goal-summary-label">Qué mira del producto</span>
                  <div className="goal-uses">
                    {describeUses(goal.uses).map((u) => (
                      <span key={u} className="goal-use-chip">{u}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="goal-code">Código interno</label>
                <div className="goal-code-field">
                  <IoLockClosedOutline className="goal-code-field-icon" aria-hidden />
                  <input id="goal-code" type="text" value={displayCode(goal.code)} readOnly disabled />
                </div>
                <small className="form-hint">Lo usa el código para saber qué meta es. No se puede cambiar.</small>
              </div>

              <Input
                label="Nombre visible *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                fullWidth
              />

              <div className="form-group">
                <label htmlFor="goal-description">Descripción *</label>
                <textarea
                  id="goal-description"
                  className="textarea"
                  rows={4}
                  maxLength={400}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <small className="form-hint">
                  {description.length}/400 · La ve el usuario al elegir la meta y la usa la IA para explicarla.
                </small>
              </div>

              <div className="form-group">
                <label id="goal-icon-label">Ícono</label>
                <div className="goal-icon-picker" role="radiogroup" aria-labelledby="goal-icon-label">
                  {view.iconOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={icon === option}
                      aria-label={option}
                      title={option}
                      className={`goal-icon-option ${icon === option ? 'is-active' : ''}`}
                      onClick={() => setIcon(option)}
                    >
                      <GoalIcon name={option} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <Input
                  label="Orden dentro del grupo"
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  fullWidth
                />
                <small className="form-hint">Las de menor número aparecen primero en la app.</small>
              </div>

              {touched && textErrors.length > 0 && (
                <ul className="goal-form-errors">
                  {textErrors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
            </div>

            <div className="modal-form-right">
              <h3 className="modal-column-title">Umbrales</h3>
              {goal.paramSpecs.length === 0 ? (
                <p className="goal-muted">
                  Esta meta no tiene umbrales: sigue el criterio NOVA 4. {NOVA4_HINT}
                </p>
              ) : (
                <>
                  <small className="form-hint goal-params-intro">
                    Valores por 100 g (sólidos) y por 100 ml (líquidos). La lógica de la meta no cambia: solo los valores.
                  </small>
                  <div className="goal-params">
                    {goal.paramSpecs.map((spec) => (
                      <ParamField
                        key={spec.key}
                        spec={spec}
                        draft={draft[spec.key]}
                        errors={paramErrors.fields[spec.key]}
                        nutrientRef={spec.nutrientLimitRef ? view.nutrientLimits.find((n) => n.code === spec.nutrientLimitRef) : undefined}
                        current={values[spec.key]}
                        onChange={setField}
                      />
                    ))}
                  </div>
                  {paramErrors.general.length > 0 && (
                    <ul className="goal-form-errors">
                      {paramErrors.general.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                </>
              )}

              {goal.roles.length > 0 && (
                <>
                  <h3 className="modal-column-title goal-roles-title">Ingredientes que cuentan</h3>
                  <small className="form-hint goal-params-intro">
                    Cuando el producto no trae tabla nutricional, la meta mira los ingredientes: cuenta las variantes
                    que tengan alguno de estos atributos.
                  </small>
                  <div className="goal-roles">
                    {goal.roles.map((r) => (
                      <fieldset key={r.role} className="goal-param goal-role">
                        <legend>{r.label}</legend>
                        <p className="goal-param-help">{r.help}</p>
                        <AttributePicker
                          id={`goal-role-${r.role}`}
                          options={attributeOptions}
                          selectedIds={roles[r.role] ?? []}
                          onChange={(ids) => setRoles((prev) => ({ ...prev, [r.role]: ids }))}
                          fallbackNames={fallbackNames}
                          disabled={saving}
                        />
                      </fieldset>
                    ))}
                  </div>
                </>
              )}

              {(thresholdsChanged || rolesChanged) && (
                <div className="goal-warning" role="status">
                  {thresholdsChanged && rolesChanged
                    ? 'Cambiar umbrales y atributos'
                    : thresholdsChanged
                      ? 'Cambiar umbrales'
                      : 'Cambiar atributos'}{' '}
                  marca como <strong>desactualizados</strong> los análisis de{' '}
                  {goal.usersCount === 1 ? '1 usuario' : `${goal.usersCount} usuarios`} con esta meta. Se vuelven a
                  evaluar cuando cada usuario actualiza el análisis o vuelve a escanear el producto.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      <div className="modal-footer goal-modal-footer">
        <div className="goal-modal-footer-side">
          <Button type="button" variant="outline" onClick={() => onHistory(goal)} disabled={saving}>
            Historial
          </Button>
          <AdminOnly>
            <Button type="button" variant={goal.isActive ? 'danger' : 'primary'} onClick={() => onToggleActive(goal)} disabled={saving}>
              {goal.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </AdminOnly>
        </div>
        <div className="goal-modal-footer-side">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="goal-form" variant="primary" loading={saving} disabled={saving || (touched && invalid)}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface ParamFieldProps {
  spec: GoalParamSpec;
  draft: ParamDraft[string] | undefined;
  errors?: Partial<Record<'g' | 'ml' | 'value', string>>;
  nutrientRef?: { name: string; unit: string | null; solidLimit: number | null; liquidLimit: number | null };
  current: unknown;
  onChange: (key: string, basis: 'g' | 'ml' | null, text: string) => void;
}

function ParamField({ spec, draft, errors, nutrientRef, current, onChange }: ParamFieldProps) {
  const range = (basis: 'g' | 'ml') => {
    const r = basis === 'ml' && spec.mlRange ? spec.mlRange : { min: spec.min, max: spec.max };
    return `${fmtNumber(r.min)}–${fmtNumber(r.max)}`;
  };
  // Referencia de Nutrientes: el mismo exceso cargado allá (octógono). No se sincroniza.
  const refValue = current && typeof current === 'object' ? (current as { g: number; ml: number }) : null;
  const differs =
    nutrientRef && refValue &&
    ((nutrientRef.solidLimit !== null && nutrientRef.solidLimit !== refValue.g) ||
      (nutrientRef.liquidLimit !== null && nutrientRef.liquidLimit !== refValue.ml));

  return (
    <fieldset className="goal-param">
      <legend>{spec.label}</legend>
      <p className="goal-param-help">{spec.help}</p>
      {spec.perBasis && typeof draft === 'object' ? (
        <div className="goal-param-inputs">
          {(['g', 'ml'] as const).map((basis) => (
            <label key={basis} className={`goal-param-input ${errors?.[basis] ? 'has-error' : ''}`}>
              <span className="goal-param-basis">{basis === 'g' ? 'Sólidos (100 g)' : 'Líquidos (100 ml)'}</span>
              <span className="goal-param-control">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={draft[basis]}
                  onChange={(e) => onChange(spec.key, basis, e.target.value)}
                  aria-invalid={!!errors?.[basis]}
                />
                <span className="goal-param-unit">{spec.unit}</span>
              </span>
              <span className="goal-param-range">{errors?.[basis] ?? `Permitido: ${range(basis)} ${spec.unit}`}</span>
            </label>
          ))}
        </div>
      ) : (
        <label className={`goal-param-input ${errors?.value ? 'has-error' : ''}`}>
          <span className="goal-param-control">
            <input
              type="number"
              step={spec.integer ? 1 : 'any'}
              inputMode={spec.integer ? 'numeric' : 'decimal'}
              value={typeof draft === 'string' ? draft : ''}
              onChange={(e) => onChange(spec.key, null, e.target.value)}
              aria-invalid={!!errors?.value}
            />
            <span className="goal-param-unit">{spec.unit}</span>
          </span>
          <span className="goal-param-range">
            {errors?.value ?? `Permitido: ${fmtNumber(spec.min)}–${fmtNumber(spec.max)} ${spec.unit}`}
          </span>
        </label>
      )}
      {nutrientRef && (
        <p className={`goal-param-ref ${differs ? 'is-different' : ''}`}>
          <span className="goal-param-ref-label">Referencia en Nutrientes:</span>{' '}
          {formatLimit(nutrientRef.solidLimit, nutrientRef.unit)} sólidos · {formatLimit(nutrientRef.liquidLimit, nutrientRef.unit)} líquidos
          {differs && <span className="goal-param-ref-note">No coincide: cada valor se usa por separado.</span>}
        </p>
      )}
      {spec.source && <p className="goal-param-source">Fuente: {spec.source}</p>}
    </fieldset>
  );
}

const formatLimit = (value: number | null, unit: string | null) => (value === null ? '—' : `${fmtNumber(value)} ${unit ?? ''}`.trim());
