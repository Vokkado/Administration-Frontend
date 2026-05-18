/**
 * Sistema de espaciado para la aplicación de administración
 * Adaptado del frontend móvil para mantener consistencia visual
 */

export const Spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const;

/**
 * Bordes redondeados
 */
export const BorderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Sombras para elementos elevados
 */
export const Shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  lg: '0 4px 8px 0 rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px 0 rgba(0, 0, 0, 0.2)',
} as const;
