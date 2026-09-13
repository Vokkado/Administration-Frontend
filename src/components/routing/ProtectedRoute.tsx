/**
 * Componente de Ruta Protegida
 *
 * - Sin sesión → /login
 * - Con sesión pero sin rol (o cuenta desactivada / error al verificar) → /access
 * - Con rol → renderiza la página
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

  const allowed = status === 'authorized' && !!user?.roles.some((role) => roles.includes(role));
  if (!allowed) {
    return <Navigate to="/access" replace />;
  }

  return <>{children}</>;
}
