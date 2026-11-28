/**
 * Criterio de ultraprocesado (NOVA 4) para quien lo marca a mano en el admin. Es el mismo que usa la
 * IA (Backend: shared/domain/nova.ts). Lo importante: la cantidad de ingredientes no lo define.
 */
export const NOVA4_HINT =
  'Ultraprocesado (NOVA 4): lo deciden los atributos de los ingredientes ("Ultraprocesado (NOVA 4)" y "Ultraprocesado leve (NOVA 4)"), los mismos que usan el puntaje y la meta. Este tilde es solo un respaldo: marcalo cuando la lista no muestra nada pero tiene un ingrediente compuesto que puede esconder aditivos ("pan rallado", "condimento preparado").';
