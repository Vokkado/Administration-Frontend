/**
 * Context de Autenticación
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { type AuthResult } from '../modules/auth/services/auth.service';
import { type AuthStatus, type CurrentUser } from '../modules/auth/types';

interface AuthContextType {
  user: CurrentUser | null;
  status: AuthStatus;
  statusError: string;
  loading: boolean;
  /** Tiene sesión Y rol para usar el panel. */
  isAuthenticated: boolean;
  /** Tiene sesión de Cognito resuelta (con o sin rol). */
  hasSession: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult & { status?: AuthStatus }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<AuthStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
