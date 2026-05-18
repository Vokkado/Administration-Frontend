/**
 * Configuración de AWS Amplify para Frontend de Administración
 */

import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const region = import.meta.env.VITE_COGNITO_REGION || 'us-east-1';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
};

// Validar configuración
if (import.meta.env.DEV) {
  console.log('🔧 Amplify Config (Admin):', {
    isConfigured: !!(userPoolId && userPoolClientId),
    region,
  });

  if (!userPoolId || !userPoolClientId) {
    console.warn(
      '⚠️ AWS Cognito no configurado. Por favor configura las variables de entorno.'
    );
  }
}

Amplify.configure(amplifyConfig);

export { amplifyConfig };
