/**
 * Sistema de colores para la aplicación de administración
 * Adaptado del frontend móvil para mantener consistencia visual
 */

// Paleta de colores base
export const ColorPalette = {
  primaryDark: '#22521D',
  primary: '#5B8806',
  primaryLight: '#B8C445',
  secondary: '#885B02',
  alternative: '#A7BECE',
  friendlyWhite: '#F1F1F1',
  dark: '#161616',
  white: '#FCFCFC',
  grey: '#727272',
} as const;

const tintColorLight = ColorPalette.primary;
const tintColorDark = ColorPalette.primaryLight;

export const Colors = {
  light: {
    // Colores de marca
    primary: ColorPalette.primary,
    primaryDark: ColorPalette.primaryDark,
    primaryLight: ColorPalette.primaryLight,
    secondary: ColorPalette.secondary,
    alternative: ColorPalette.alternative,

    // Colores base de la paleta
    friendlyWhite: ColorPalette.friendlyWhite,
    white: ColorPalette.white,
    grey: ColorPalette.grey,
    dark: ColorPalette.dark,

    // Fondos
    background: ColorPalette.friendlyWhite,
    surface: ColorPalette.white,
    card: ColorPalette.white,
    
    // Texto
    text: ColorPalette.primaryDark,
    textSecondary: ColorPalette.secondary,
    textMuted: ColorPalette.grey,
    
    // UI Elements
    tint: tintColorLight,
    icon: ColorPalette.primary,
    tabIconDefault: ColorPalette.grey,
    tabIconSelected: tintColorLight,
    border: ColorPalette.alternative,
    
    // Estados
    success: ColorPalette.primary,
    warning: ColorPalette.secondary,
    error: '#DC2626',
    info: ColorPalette.alternative,
    
    // Interactivos
    buttonPrimary: ColorPalette.primary,
    buttonSecondary: ColorPalette.secondary,
    buttonDisabled: ColorPalette.grey,
    link: ColorPalette.primaryDark,
  },
  dark: {
    // Colores de marca (ajustados para mejor visibilidad en oscuro)
    primary: ColorPalette.primaryLight,
    primaryDark: ColorPalette.primary,
    primaryLight: ColorPalette.primaryLight,
    secondary: '#D4A574', // Secondary más claro para contraste
    alternative: ColorPalette.alternative,

    // Colores base de la paleta
    friendlyWhite: ColorPalette.friendlyWhite,
    white: ColorPalette.white,
    grey: ColorPalette.grey,
    dark: ColorPalette.dark,

    // Fondos
    background: ColorPalette.dark,
    surface: '#252525',
    card: '#2D2D2D',
    
    // Texto
    text: ColorPalette.friendlyWhite,
    textSecondary: '#D4A574',
    textMuted: '#9CA3AF',
    
    // UI Elements
    tint: tintColorDark,
    icon: ColorPalette.primaryLight,
    tabIconDefault: ColorPalette.grey,
    tabIconSelected: tintColorDark,
    border: '#374151',
    
    // Estados
    success: ColorPalette.primaryLight,
    warning: '#D4A574',
    error: '#EF4444',
    info: ColorPalette.alternative,
    
    // Interactivos
    buttonPrimary: ColorPalette.primaryLight,
    buttonSecondary: '#D4A574',
    buttonDisabled: '#4B5563',
    link: ColorPalette.primaryLight,
  },
} as const;

export type ColorScheme = typeof Colors.light;
