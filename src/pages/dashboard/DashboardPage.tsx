import { useNavigate } from 'react-router-dom';
import { Button, DashboardCard } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
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
}

interface DashboardGroupConfig {
  name: string;
  /** Color inicio del gradiente */
  color: string;
  /** Color fin del gradiente */
  colorEnd: string;
  cards: DashboardCardConfig[];
}

const DASHBOARD_GROUPS: DashboardGroupConfig[] = [
  {
    name: 'Catálogo',
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
    color: 'var(--color-grey)',
    colorEnd: 'var(--color-border)',
    cards: [
      { title: 'Usuarios', description: 'Administra a los usuarios', path: '/users', buttonLabel: 'Ver Usuarios' },
      { title: 'Reportes', description: 'Gestiona reportes de BUG y productos faltantes', path: '/reports', buttonLabel: 'Ver Reportes' },
      { title: 'Preguntas frecuentes', description: 'Gestiona las FAQs visibles en la app', path: '/faqs', buttonLabel: 'Ver FAQs' },
      { title: 'Notificaciones', description: 'Envía notificaciones push a los usuarios', path: '/notifications', buttonLabel: 'Ver Notificaciones' },
    ],
  },
];

/* ───────────────────────────────────────────────────────────── */

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout title="Administración de Vokkado">
      <div className="dashboard-groups">
        {DASHBOARD_GROUPS.map((group) => (
          <section key={group.name} className="dashboard-group">
            <h3 className="dashboard-group-title">
              {group.name}
            </h3>

            <div className="dashboard-grid">
              {group.cards.map((card) => (
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
