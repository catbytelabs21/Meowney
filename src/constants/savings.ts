import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MeowneyColors } from '@/theme/colors';
import { getDefaultColorOptions } from './shared';

export type SavingIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const SAVING_ICON_OPTIONS: SavingIconName[] = [
  'piggy-bank-outline',
  'cat',
  'fish',
  'bell-outline',
  'home-outline',
  'airplane',
  'car-outline',
  'school-outline',
  'gift-outline',
  'shield-check-outline',
  'laptop',
  'heart-outline',
  'star-outline',
  'paw-outline',
  'mouse-variant',
];

export function getSavingColorOptions(colors: MeowneyColors) {
  return getDefaultColorOptions(colors);
}
