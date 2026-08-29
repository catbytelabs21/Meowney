export const brandColors = {
  irisGleam: '#847DFF',
  cyanSignal: '#00B3DD',
  paleIris: '#D1C9FF',
  deepIris: '#4B49AA',
  orchidBloom: '#DD90D8',
  periwinkle: '#90B8F0',
  obsidian: '#0F1011',
  abyss: '#090A0B',
  graphite: '#2E2E2E',
  steel: '#3F4041',
  silver: '#CACACA',
  fog: '#6A6B6B',
  ash: '#9F9FA0',
  cloud: '#F5F5F7',
  pure: '#FFFFFF',
  void: '#000000',
  success: '#7DD8A8',
  warning: '#F1C27D',
  error: '#FFB4AB',
} as const;

export const lightColors = {
  ...brandColors,
  primary: brandColors.void,
  secondary: brandColors.deepIris,
  background: '#F5F5F7',
  surface: brandColors.pure,
  surfaceAlt: '#ECECEF',
  surfaceElevated: brandColors.cloud,
  text: brandColors.void,
  mutedText: '#5E6064',
  border: '#D8D8DE',
  pressed: '#E4E4EA',
  selected: '#E7E7EC',
  disabled: '#B8B8BE',
  onPrimary: brandColors.pure,
  backdrop: 'rgba(0,0,0,0.42)',
  modalBackdrop: 'rgba(0,0,0,0.32)',
  processingOverlay: 'rgba(0,0,0,0.34)',
  swatchOverlay: 'rgba(255,255,255,0.42)',
  success: '#2E7D5B',
  warning: '#A66A00',
  error: '#BA1A1A',
} as const;

export const darkColors = {
  ...brandColors,
  primary: brandColors.pure,
  secondary: brandColors.paleIris,
  background: brandColors.obsidian,
  surface: brandColors.abyss,
  surfaceAlt: brandColors.graphite,
  surfaceElevated: brandColors.steel,
  text: brandColors.cloud,
  mutedText: brandColors.ash,
  border: 'rgba(255,255,255,0.14)',
  pressed: brandColors.steel,
  selected: 'rgba(255,255,255,0.12)',
  disabled: brandColors.fog,
  onPrimary: brandColors.void,
  backdrop: 'rgba(0,0,0,0.42)',
  modalBackdrop: 'rgba(0,0,0,0.32)',
  processingOverlay: 'rgba(0,0,0,0.34)',
  swatchOverlay: 'rgba(255,255,255,0.42)',
  success: '#7DD8A8',
  warning: '#F1C27D',
  error: '#FFB4AB',
} as const;

export type MeowneyColors = {
  [Key in keyof typeof darkColors]: string;
};

export type MeowneyColorScheme = 'light' | 'dark';

export function getMeowneyColors(colorScheme: MeowneyColorScheme) {
  return colorScheme === 'light' ? lightColors : darkColors;
}
