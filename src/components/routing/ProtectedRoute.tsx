/**
 * Componente de Ruta Protegida
 *
 * - Sin sesión → /login
 * - Sin acceso al panel (o cuenta desactivada / error al verificar) → /access
 * - Con acceso al panel pero sin el rol de esta sección → /dashboard
 * - Con el rol → renderiza la página
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles que habilitan la ruta (alcanza con uno). Por defecto, admin. */
  roles?: string[];
}

export function ProtectedRoute({ children, roles = ['admin'] }: ProtectedRouteProps) {
  const { status, user } = useAuthContext();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#757575'
      }}>
        Verificando autenticación...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Con acceso al panel pero sin el rol de esta sección (p. ej. el editor de catálogo entrando a
  // Usuarios): vuelve al dashboard, que ya muestra solo lo suyo. Sin acceso al panel: /access.
  if (status === 'authorized' && !user?.roles.some((role) => roles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }
  if (status !== 'authorized') {
    return <Navigate to="/access" replace />;
  }

  return <>{children}</>;
}
