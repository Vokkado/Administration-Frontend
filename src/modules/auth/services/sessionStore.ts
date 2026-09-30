/**
 * Id de la sesión de este navegador ("Sesiones y dispositivos"). El cliente HTTP lo manda en cada
 * request (header X-Session-Id); si la sesión se cierra desde otro lado, el backend corta el acceso.
 * Sin dependencias del cliente HTTP para no generar un import circular.
 */
const KEY = 'vokkado_admin_session_id';

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage bloqueado (modo privado): la app funciona igual, sin sesión registrada.
  }
}
