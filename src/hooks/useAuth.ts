/**
 * Hook de Autenticación
 */

import { useState, useEffect } from 'react';
import { AuthService, type AdminSession } from '../modules/auth/services/auth.service';

export function useAuth() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentSession = await AuthService.getCurrentSession();
      
      if (currentSession && currentSession.user.groups.includes('admin')) {
        setSession(currentSession);
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error checking auth:', error);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await AuthService.signInAdmin({ email, password });
    
    if (result.success && result.data) {
      setSession(result.data);
      setIsAuthenticated(true);
    }
    
    return result;
  };

  const signOut = async () => {
    await AuthService.signOut();
    setSession(null);
    setIsAuthenticated(false);
  };

  return {
    session,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    checkAuth,
  };
}
