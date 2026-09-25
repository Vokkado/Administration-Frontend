import { useNavigate } from 'react-router-dom';
import { Button, DashboardCard } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useRoles } from '../../hooks/useRoles';
import { ADMIN_ONLY_ROLES, CATALOG_ROLES } from '../../modules/auth/types';
import './DashboardPage.css';

/* ─────────────────────────────────────────────────────────────
 * CONFIGURACIÓN DEL DASHBOARD
 * Para agregar/quitar/reordenar tarjetas o grupos, solo modifica
 * este array. Cada grupo tiene un nombre, color y sus tarjetas.
 * ───────────────────────────────────────────────────────────── */

interface DashboardCardConfig {
  title: string;
  description: string;
  path: string;
  buttonLabel: string;
  /** Roles que ven la tarjeta, si es más restrictiva que su grupo. Por defecto, los del grupo. */
  roles?: string[];
}

interface DashboardGroupConfig {
  name: string;
  /** Roles que ven el grupo (alcanza con uno). */
  roles: string[];
  /** Color inicio del gradiente */
  color: string;
  /** Color fin del gradiente */
  colorEnd: string;
  cards: DashboardCardConfig[];
}

const DASHBOARD_GROUPS: DashboardGroupConfig[] = [
  {
    name: 'Validación',
    roles: CATALOG_ROLES,
    color: 'var(--color-warning, #f59e0b)',
    colorEnd: 'var(--color-primary-light)',
    cards: [
      { title: 'Validar productos', description: 'Revisá los productos cargados por IA: confirmá ingredientes, alérgenos y nutrición', path: '/validation', buttonLabel: 'Validar productos' },
      // Enriquecer corre en lote y consume servicios externos: solo admin (ver ROLES.md).
      { title: 'Enriquecer productos', description: 'Buscá en internet la nutrición e ingredientes que les faltan a las fichas de referencia', path: '/enrichment', buttonLabel: 'Enriquecer', roles: ADMIN_ONLY_ROLES },
    ],
  },
  {
    name: 'Catálogo',
    roles: CATALOG_ROLES,
    color: 'var(--color-primary)',
    colorEnd: 'var(--color-primary-light)',
    cards: [
      { title: 'Productos', description: 'Gestiona los productos alimenticios', path: '/products', buttonLabel: 'Ver Productos' },
      { title: 'Ingredientes', description: 'Gestiona los ingredientes', path: '/ingredients', buttonLabel: 'Ver Ingredientes' },
      { title: 'Categorías', description: 'Gestiona las categorías de productos', path: '/categories', buttonLabel: 'Ver Categorías' },
      { title: 'Empresas', description: 'Gestiona las empresas productoras', path: '/companies', buttonLabel: 'Ver Empresas' },
    ],
  },
  {
    name: 'Composición',
    roles: CATALOG_ROLES,
    color: 'var(--color-secondary)',
    colorEnd: 'var(--color-primary-light)',
    cards: [
      { title: 'Restricciones', description: 'Gestiona las restricciones alimenticias', path: '/restrictions', buttonLabel: 'Ver Restricciones' },
      { title: 'Alérgenos', description: 'Gestiona los alérgenos del sistema', path: '/allergens', buttonLabel: 'Ver Alérgenos' },
      { title: 'Atributos', description: 'Gestiona atributos y tipos de atributo', path: '/attributes', buttonLabel: 'Ver Atributos' },
      { title: 'Valores Nutricionales', description: 'Gestiona los valores nutricionales', path: '/nutrition-facts', buttonLabel: 'Ver Valores Nutricionales' },
    ],
  },
  {
    name: 'Administración',
    roles: ADMIN_ONLY_ROLES,
    color: 'var(--color-grey)',
    colorEnd: 'var(--color-border)',
    cards: [
      { title: 'Accesos y roles', description: 'Administra las cuentas y qué rol tiene cada una', path: '/users', buttonLabel: 'Ver Accesos' },
      { title: 'Solicitudes de acceso', description: 'Aprobá o rechazá los pedidos de acceso al panel', path: '/access-requests', buttonLabel: 'Ver Solicitudes' },
      { title: 'Verificaciones profesionales', description: 'Verificá el registro de los nutricionistas que piden acceso a su web', path: '/professional-verifications', buttonLabel: 'Ver Verificaciones' },
      { title: 'Reportes', description: 'Gestiona reportes de BUG y productos faltantes', path: '/reports', buttonLabel: 'Ver Reportes' },
      { title: 'Preguntas frecuentes', description: 'Gestiona las FAQs visibles en la app', path: '/faqs', buttonLabel: 'Ver FAQs' },
      { title: 'Notificaciones', description: 'Envía notificaciones push a los usuarios', path: '/notifications', buttonLabel: 'Ver Notificaciones' },
      { title: 'Términos y Privacidad', description: 'Edita y publica nuevas versiones de los Términos y la Política de Privacidad', path: '/legal', buttonLabel: 'Editar Términos' },
    ],
  },
  {
    name: 'Estadísticas',
    roles: ADMIN_ONLY_ROLES,
    color: 'var(--color-primary)',
    colorEnd: 'var(--color-primary-light)',
    cards: [
      { title: 'Usuarios', description: 'Ranking de contribuidores: puntos, escaneos, cargas, aprobados y carritos', path: '/statistics/users', buttonLabel: 'Ver Usuarios' },
      { title: 'Productos', description: 'Cantidad de escaneos por producto y detalle demográfico', path: '/statistics/products', buttonLabel: 'Ver Productos' },
      { title: 'Insignias', description: 'Editar nombre, umbral (cantidad) y foto de cada insignia', path: '/statistics/badges', buttonLabel: 'Ver Insignias' },
    ],
  },
];

/* ───────────────────────────────────────────────────────────── */

export function DashboardPage() {
  const navigate = useNavigate();
  const { roles } = useRoles();
  // El editor de catálogo no ve Administración ni Estadísticas: el backend igual las bloquea.
  const groups = DASHBOARD_GROUPS.filter((group) => group.roles.some((role) => roles.includes(role)));

  return (
    <AdminLayout title="Administración de Vokkado">
      <div className="dashboard-groups">
        {groups.map((group) => (
          <section key={group.name} className="dashboard-group">
            <h3 className="dashboard-group-title">
              {group.name}
            </h3>

            <div className="dashboard-grid">
              {group.cards
                .filter((card) => !card.roles || card.roles.some((role) => roles.includes(role)))
                .map((card) => (
                  <DashboardCard
                    key={card.path}
                    title={card.title}
                    description={card.description}
                    color={group.color}
                    colorEnd={group.colorEnd}
                  >
                    <Button variant="primary" fullWidth onClick={() => navigate(card.path)}>
                      {card.buttonLabel}
                    </Button>
                  </DashboardCard>
                ))}
            </div>
          </section>
        ))}
      </div>
    </AdminLayout>
  );
}
