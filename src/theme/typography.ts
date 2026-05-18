/**
 * Sistema de tipografía para la aplicación de administración
 * Adaptado del frontend móvil para mantener consistencia visual
 */

export const Typography = {
  /**
   * Familias de fuentes
   */
  fontFamily: {
    regular: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    medium: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    semibold: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    bold: 'Lexend, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  /**
   * Tamaños de fuente
   */
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  /**
   * Alturas de línea
   */
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
  
  /**
   * Pesos de fuente
   */
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
