/**
 * Metas y Embarazo (Admin).
 *
 * - Metas: las que el usuario puede elegir en la app. Qué metas existen y su lógica viven en el código
 *   (cada una con su código interno fijo). Acá se ajusta lo editable: nombre, descripción, ícono,
 *   orden, umbrales y qué atributos cuentan para cada rol cuando la meta mira ingredientes (mismo
 *   vínculo que atributo ↔ restricción). Activar / desactivar es solo de admin. No hay alta ni baja.
 * - Embarazo: restricción de sistema (Limitar → Precaución) que se suma sola a quien marcó embarazo
 *   en su perfil. Acá se vinculan / desvinculan sus atributos.
 */
import { useCallback, useMemo, useState } from 'react';
import { Button, ConfirmDialog, NotificationBanner, PageHeader, SearchInput } from '../../components/ui';
import type { ColumnFilterOption } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { useGoalsAdminView } from '../../hooks/useGoalsAdminView';
import { useAttributeOptions } from '../../hooks/useAttributeOptions';
import { GoalsService } from '../../services/goals.service';
import type { AdminGoal, AttributeRef, GoalGroup, UpdateGoalInput } from '../../services/goals.service';
import { getApiMessage } from '../../services/apiError';
import { matchesSearch } from '../../utils/search';
import { GoalsTable } from './components/GoalsTable';
import { PregnancyPanel } from './components/PregnancyPanel';
import { GoalEditModal } from './components/GoalEditModal';
import { GoalHistoryModal } from './components/GoalHistoryModal';
import { GroupsModal } from './components/GroupsModal';
import { displayCode } from './goalFormat';
import './GoalsPage.css';

type Tab = 'goals' | 'pregnancy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'goals', label: 'Metas' },
  { id: 'pregnancy', label: 'Embarazo' },
];

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  goals: 'Buscar por nombre, código o descripción...',
  pregnancy: 'Buscar atributo o tipo...',
};

export function GoalsPage() {
  const { view, loading, error: loadError, reload } = useGoalsAdminView();
  const { options: attributeOptions, error: optionsError, reload: reloadOptions } = useAttributeOptions();
  const crud = useCRUDActions();

  const [activeTab, setActiveTab] = useState<Tab>('goals');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [editing, setEditing] = useState<AdminGoal | null>(null);
  const [history, setHistory] = useState<AdminGoal | null>(null);
  const [toggling, setToggling] = useState<AdminGoal | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [pageError, setPageError] = useState('');

  const groupName = useCallback(
    (code: string) => view?.groups.find((g) => g.code === code)?.name ?? code,
    [view],
  );

  const groupOptions = useMemo<ColumnFilterOption[]>(
    () => [{ value: 'ALL', label: 'Todos' }, ...(view?.groups ?? []).map((g) => ({ value: g.code, label: g.name }))],
    [view],
  );

  // Búsqueda por nombre, código interno o descripción (sin tildes ni mayúsculas).
  const filteredGoals = useMemo(
    () =>
      (view?.goals ?? []).filter(
        (g) =>
          (filterGroup === 'ALL' || g.group === filterGroup) &&
          (filterStatus === 'ALL' || (filterStatus === 'ACTIVE') === g.isActive) &&
          (!searchTerm ||
            matchesSearch(g.name, searchTerm) ||
            matchesSearch(displayCode(g.code), searchTerm) ||
            matchesSearch(g.description, searchTerm)),
      ),
    [view, filterGroup, filterStatus, searchTerm],
  );

  const filteredPregnancyAttributes = useMemo(
    () =>
      (view?.pregnancy?.attributes ?? []).filter(
        (attr) => !searchTerm || matchesSearch(attr.name, searchTerm) || matchesSearch(attr.typeName, searchTerm),
      ),
    [view, searchTerm],
  );

  // Vincular / desvincular atributos del embarazo: se manda la lista completa de restricciones de
  // cada atributo, así que sin la lista de atributos cargada no se toca nada (se borrarían las otras).
  const setPregnancyLinks = async (attributeIds: string[], linked: boolean): Promise<boolean> => {
    const pregnancy = view?.pregnancy;
    if (!pregnancy) return false;
    setSaving(true);
    setPageError('');
    try {
      for (const id of attributeIds) {
        const option = attributeOptions.find((o) => o.id === id);
        if (!option) throw new Error('Todavía no cargó la lista de atributos: probá de nuevo en un momento.');
        await GoalsService.setPregnancyLink(id, option.restrictionIds, pregnancy.restrictionId, linked);
      }
      await Promise.all([reload(), reloadOptions()]);
      crud.showSuccess(
        linked
          ? attributeIds.length === 1 ? '✅ Atributo vinculado al embarazo' : '✅ Atributos vinculados al embarazo'
          : '✅ Atributo desvinculado del embarazo',
      );
      return true;
    } catch (err: unknown) {
      setPageError(getApiMessage(err, 'No se pudo actualizar el embarazo'));
      // Puede haber quedado a medias (varios atributos): se refresca igual.
      await Promise.all([reload(), reloadOptions()]);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEdit = useCallback((goal: AdminGoal) => {
    setModalError('');
    setEditing(goal);
  }, []);

  const closeModals = () => {
    setEditing(null);
    setShowGroups(false);
    setModalError('');
  };

  const saveGoal = async (code: string, input: UpdateGoalInput) => {
    setSaving(true);
    setModalError('');
    try {
      await GoalsService.updateGoal(code, input);
      await reload();
      closeModals();
      crud.showSuccess('✅ Meta actualizada. La app la toma en unos minutos.');
    } catch (err: unknown) {
      setModalError(getApiMessage(err, 'No se pudo guardar la meta'));
    } finally {
      setSaving(false);
    }
  };

  const saveGroups = async (changed: { code: GoalGroup; name: string; sortOrder: number }[]) => {
    if (changed.length === 0) {
      closeModals();
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      for (const g of changed) await GoalsService.updateGroup(g.code, { name: g.name, sortOrder: g.sortOrder });
      await reload();
      closeModals();
      crud.showSuccess('✅ Grupos actualizados');
    } catch (err: unknown) {
      setModalError(getApiMessage(err, 'No se pudieron guardar los grupos'));
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    setSaving(true);
    setPageError('');
    try {
      await GoalsService.setActive(toggling.code, !toggling.isActive);
      await reload();
      // Si se activó / desactivó desde el modal, se cierra: los datos cambiaron.
      closeModals();
      crud.showSuccess(toggling.isActive ? '✅ Meta desactivada' : '✅ Meta activada');
    } catch (err: unknown) {
      setPageError(getApiMessage(err, 'No se pudo cambiar el estado de la meta'));
    } finally {
      setSaving(false);
      setToggling(null);
    }
  };

  const counts: Record<Tab, { total: number; one: string; many: string }> = {
    goals: { total: filteredGoals.length, one: 'meta', many: 'metas' },
    pregnancy: { total: filteredPregnancyAttributes.length, one: 'atributo', many: 'atributos' },
  };
  const { total } = counts[activeTab];
  const countLabel = total === 1 ? counts[activeTab].one : counts[activeTab].many;

  const tabs = (
    <div className="goal-page-tabs" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activeTab === t.id}
          className={`goal-page-tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => setActiveTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const headerActions = (
    <div className="header-actions">
      {/* Mismas clases que usa PageHeader para su contador. */}
      <div className="header-count">
        <span className="count-number">{total}</span>
        <span className="count-label">{countLabel}</span>
      </div>
      <div className="header-search">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={SEARCH_PLACEHOLDER[activeTab]}
        />
      </div>
      {activeTab === 'goals' && (
        <Button variant="outline" onClick={() => setShowGroups(true)} disabled={!view}>
          Grupos
        </Button>
      )}
    </div>
  );

  return (
    <AdminLayout className="page-goals">
      {/* El título es el de la pestaña; la página (Metas y Embarazo) queda en la miga de pan. */}
      <PageHeader
        breadcrumb={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Metas y Embarazo', onClick: () => setActiveTab('goals') },
          { label: TABS.find((t) => t.id === activeTab)!.label },
        ]}
        title={TABS.find((t) => t.id === activeTab)!.label}
        aboveTitle={tabs}
        actions={headerActions}
      />

      <NotificationBanner type="success" message={crud.successMessage} />
      {!editing && <NotificationBanner type="error" message={pageError || loadError || optionsError} />}

      {/* El interruptor GOALS_ENABLED apaga solo las metas: el embarazo se evalúa igual. */}
      {activeTab === 'goals' && view && !view.enabled && (
        <div className="goal-warning goal-disabled-banner" role="status">
          Las metas están <strong>apagadas</strong> en el servidor (GOALS_ENABLED=false): los cambios se guardan, pero la
          app no las muestra ni las evalúa hasta que se prendan.
        </div>
      )}

      {activeTab === 'goals' && (
        <GoalsTable
          goals={filteredGoals}
          loading={loading && !view}
          groupName={groupName}
          groupOptions={groupOptions}
          filterGroup={filterGroup}
          onFilterGroupChange={setFilterGroup}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          onEdit={openEdit}
        />
      )}

      {activeTab === 'pregnancy' && (
        <PregnancyPanel
          pregnancy={view?.pregnancy ?? null}
          attributes={filteredPregnancyAttributes}
          options={attributeOptions}
          loading={loading && !view}
          saving={saving}
          onLink={(ids) => setPregnancyLinks(ids, true)}
          onUnlink={async (attr: AttributeRef) => {
            await setPregnancyLinks([attr.id], false);
          }}
        />
      )}

      {view && (
        <>
          <GoalEditModal
            goal={editing}
            view={view}
            attributeOptions={attributeOptions}
            saving={saving}
            error={modalError}
            onClose={closeModals}
            onSave={saveGoal}
            onHistory={setHistory}
            onToggleActive={setToggling}
          />
          <GroupsModal
            show={showGroups}
            groups={view.groups}
            saving={saving}
            error={modalError}
            onClose={closeModals}
            onSave={saveGroups}
          />
        </>
      )}
      <GoalHistoryModal goal={history} onClose={() => setHistory(null)} />

      <ConfirmDialog
        show={toggling !== null}
        title={toggling?.isActive ? 'Desactivar meta' : 'Activar meta'}
        message={
          toggling?.isActive
            ? `"${toggling.name}" deja de ofrecerse en la app y no se evalúa más. Los ${toggling.usersCount} usuarios que la eligieron la conservan: si se vuelve a activar, la recuperan. Sus análisis quedan desactualizados.`
            : `"${toggling?.name ?? ''}" vuelve a ofrecerse en la app y a evaluarse para quienes la tenían elegida.`
        }
        confirmText={toggling?.isActive ? 'Desactivar' : 'Activar'}
        variant={toggling?.isActive ? 'danger' : 'primary'}
        loading={saving}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </AdminLayout>
  );
}
