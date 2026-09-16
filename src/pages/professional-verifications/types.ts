/**
 * Tipos para la revisión de verificaciones profesionales (acceso a la web de nutricionistas)
 */

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type VerificationStatusFilter = VerificationStatus | 'ALL';

export interface ProfessionalVerification {
  id: string;
  userId: string;
  status: VerificationStatus;
  source: 'application' | 'legacy' | 'manual';
  fullName: string | null;
  licenseNumber: string | null;
  licenseIssuer: string | null;
  countryCode: string | null;
  organizationName: string | null;
  message: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  userEmail: string;
  userName: string | null;
  reviewedByEmail: string | null;
}

export interface VerificationListResponse {
  items: ProfessionalVerification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VerificationFilters {
  status: VerificationStatusFilter;
  search: string;
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const VERIFICATION_SOURCE_LABELS: Record<ProfessionalVerification['source'], string> = {
  application: 'Solicitud',
  legacy: 'Existente (beta)',
  manual: 'Rol dado a mano',
};
