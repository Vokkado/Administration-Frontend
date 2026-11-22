/**
 * Texto "Validado por X el …" (migración 289 del backend: validated_by / validated_at).
 * Para lo validado antes de que existiera el registro (o en flujos viejos) no hay quién: se dice así.
 */
export function validatedByText(email?: string | null, at?: string | Date | null, verb = 'Validado'): string {
  const when = at ? new Date(at).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  if (!email && !when) return `${verb} (sin registro de quién: antes del 1/10/2026)`;
  return `${verb}${email ? ` por ${email}` : ''}${when ? ` el ${when}` : ''}`;
}
