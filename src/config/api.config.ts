/**
 * Configuración de la API
 */

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// En producción, rechazar URLs HTTP (excepto localhost)
if (!import.meta.env.DEV && baseURL.startsWith('http://') && !baseURL.includes('localhost')) {
  throw new Error('API URL must use HTTPS in production');
}

export const API_CONFIG = {
  baseURL,
  timeout: 120000, // 30 segundos
};

export const API_ENDPOINTS = {
  // Auth
  validateAdmin: '/auth/validate-admin',
  
  // Restrictions
  restrictions: '/restrictions',
  restrictionById: (id: string) => `/restrictions/${id}`,
  restrictionsByType: (type: string) => `/restrictions/type/${type}`,
  
  // Users
  users: '/users',
  userById: (id: string) => `/users/${id}`,

  // Reports (Admin)
  adminReports: '/admin/reports',
  adminReportById: (id: string) => `/admin/reports/${id}`,
};
