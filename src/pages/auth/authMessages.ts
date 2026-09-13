/** Textos compartidos de las pantallas de autenticación. */

/**
 * El login con Google (y Apple) no está disponible en el panel todavía: esas cuentas no tienen
 * contraseña en Cognito. Ver docs/ROLES.md del backend.
 */
export const FEDERATED_ACCOUNT_MESSAGE =
  'Este email está registrado en Vokkado con Google (o Apple). Por ahora el panel solo admite cuentas con email y contraseña, así que no es posible ingresar ni solicitar acceso con esta cuenta.';

/** La identidad existe en Cognito (registro anterior) con otra contraseña. */
export const EXISTING_COGNITO_ACCOUNT_MESSAGE =
  'Ya existe una cuenta con este email de un registro anterior, y la contraseña que ingresaste no coincide. Iniciá sesión con esa contraseña o recuperala, y después vas a poder solicitar acceso.';

export const EXISTING_ACCOUNT_MESSAGE =
  'Este email ya tiene una cuenta en Vokkado. Iniciá sesión con tu contraseña de la app y vas a poder solicitar acceso desde ahí.';
