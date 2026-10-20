/**
 * Íconos de las metas: los mismos de Ionicons que dibuja la app (react-icons/io5), para que el
 * admin vea exactamente lo que ve el usuario. La lista de nombres permitidos la da el backend
 * (iconOptions); acá solo se traduce nombre → componente.
 */
import type { IconType } from 'react-icons';
import {
  IoBanOutline,
  IoBarbellOutline,
  IoBicycleOutline,
  IoBodyOutline,
  IoCafeOutline,
  IoCloseCircleOutline,
  IoCubeOutline,
  IoEggOutline,
  IoFishOutline,
  IoFitnessOutline,
  IoFlameOutline,
  IoHappyOutline,
  IoHeartOutline,
  IoHelpCircleOutline,
  IoIceCreamOutline,
  IoLeafOutline,
  IoMedkitOutline,
  IoNutritionOutline,
  IoPulseOutline,
  IoRestaurantOutline,
  IoScaleOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoTrendingDownOutline,
  IoWalkOutline,
  IoWaterOutline,
  IoWineOutline,
} from 'react-icons/io5';

const ICONS: Record<string, IconType> = {
  'trending-down-outline': IoTrendingDownOutline,
  'barbell-outline': IoBarbellOutline,
  'water-outline': IoWaterOutline,
  'cube-outline': IoCubeOutline,
  'heart-outline': IoHeartOutline,
  'egg-outline': IoEggOutline,
  'leaf-outline': IoLeafOutline,
  'close-circle-outline': IoCloseCircleOutline,
  'nutrition-outline': IoNutritionOutline,
  'fitness-outline': IoFitnessOutline,
  'flame-outline': IoFlameOutline,
  'restaurant-outline': IoRestaurantOutline,
  'fish-outline': IoFishOutline,
  'ice-cream-outline': IoIceCreamOutline,
  'cafe-outline': IoCafeOutline,
  'wine-outline': IoWineOutline,
  'medkit-outline': IoMedkitOutline,
  'pulse-outline': IoPulseOutline,
  'body-outline': IoBodyOutline,
  'walk-outline': IoWalkOutline,
  'bicycle-outline': IoBicycleOutline,
  'scale-outline': IoScaleOutline,
  'shield-checkmark-outline': IoShieldCheckmarkOutline,
  'sparkles-outline': IoSparklesOutline,
  'ban-outline': IoBanOutline,
  'happy-outline': IoHappyOutline,
};

export function GoalIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? IoHelpCircleOutline;
  return <Icon size={size} aria-hidden />;
}
