/**
 * Tipos y constantes para Empresas (Companies)
 */

export interface Company {
  id: string;
  name: string;
  address: string | null;
  countryCode: string | null;
  isInspected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFormData {
  name: string;
  address: string;
  countryCode: string;
  isInspected: boolean;
}

export interface CreateCompanyData {
  name: string;
  address?: string | null;
  countryCode?: string | null;
  isInspected?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  address?: string | null;
  countryCode?: string | null;
  isInspected?: boolean;
}

/**
 * Códigos de país (ISO 3166-1 alpha-2) - Lista ampliada
 */
export const COUNTRY_CODES: Record<string, string> = {
  'UY': 'Uruguay',
  'AR': 'Argentina',
  'BR': 'Brasil',
  'CL': 'Chile',
  'PY': 'Paraguay',
  'BO': 'Bolivia',
  'PE': 'Perú',
  'CO': 'Colombia',
  'EC': 'Ecuador',
  'VE': 'Venezuela',
  'MX': 'México',
  'US': 'Estados Unidos',
  'CA': 'Canadá',
  'ES': 'España',
  'DE': 'Alemania',
  'FR': 'Francia',
  'IT': 'Italia',
  'PT': 'Portugal',
  'GB': 'Reino Unido',
  'IE': 'Irlanda',
  'NL': 'Países Bajos',
  'BE': 'Bélgica',
  'CH': 'Suiza',
  'AT': 'Austria',
  'SE': 'Suecia',
  'NO': 'Noruega',
  'DK': 'Dinamarca',
  'FI': 'Finlandia',
  'PL': 'Polonia',
  'CZ': 'República Checa',
  'GR': 'Grecia',
  'RO': 'Rumania',
  'HU': 'Hungría',
  'RU': 'Rusia',
  'UA': 'Ucrania',
  'TR': 'Turquía',
  'CN': 'China',
  'JP': 'Japón',
  'KR': 'Corea del Sur',
  'IN': 'India',
  'TH': 'Tailandia',
  'VN': 'Vietnam',
  'ID': 'Indonesia',
  'MY': 'Malasia',
  'PH': 'Filipinas',
  'AU': 'Australia',
  'NZ': 'Nueva Zelanda',
  'ZA': 'Sudáfrica',
  'EG': 'Egipto',
  'IL': 'Israel',
  'SA': 'Arabia Saudita',
  'AE': 'Emiratos Árabes Unidos',
  'CR': 'Costa Rica',
  'PA': 'Panamá',
  'DO': 'República Dominicana',
  'GT': 'Guatemala',
  'HN': 'Honduras',
  'SV': 'El Salvador',
  'NI': 'Nicaragua',
  'CU': 'Cuba',
};

export const getCountryName = (code: string | null): string => {
  if (!code) return '—';
  return COUNTRY_CODES[code.toUpperCase()] || code.toUpperCase();
};
