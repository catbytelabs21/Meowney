import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MeowneyColors } from '@/theme/colors';

export type SubscriptionIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const SUBSCRIPTION_ICON_OPTIONS: SubscriptionIconName[] = [
  'play-box-outline',
  'robot-outline',
  'music-note-outline',
  'television-classic',
  'cloud-outline',
  'cellphone',
  'gamepad-variant-outline',
  'book-open-page-variant-outline',
  'dumbbell',
  'coffee-outline',
  'shield-account-outline',
  'newspaper-variant-outline',
  'palette-outline',
  'cart-outline',
  'paw-outline',
];

export function getSubscriptionColorOptions(colors: MeowneyColors) {
  return [
    colors.irisGleam,
    colors.cyanSignal,
    colors.orchidBloom,
    colors.periwinkle,
    colors.paleIris,
    colors.deepIris,
    colors.success,
    colors.warning,
    colors.error,
    colors.silver,
  ];
}
