const brand = {
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
} as const;

export const lightColors = {
  ...brand,
  primary: brand.void,
  secondary: brand.deepIris,
  background: '#F5F5F7',
  surface: brand.pure,
  surfaceAlt: '#ECECEF',
  surfaceElevated: brand.cloud,
  text: brand.void,
  mutedText: '#5E6064',
  border: '#D8D8DE',
  pressed: '#E4E4EA',
  selected: '#E7E7EC',
  disabled: '#B8B8BE',
  onPrimary: brand.pure,
  success: '#2E7D5B',
  warning: '#A66A00',
  error: '#BA1A1A',
} as const;

export const darkColors = {
  ...brand,
  primary: brand.pure,
  secondary: brand.paleIris,
  background: brand.obsidian,
  surface: brand.abyss,
  surfaceAlt: brand.graphite,
  surfaceElevated: brand.steel,
  text: brand.cloud,
  mutedText: brand.ash,
  border: 'rgba(255,255,255,0.14)',
  pressed: brand.steel,
  selected: 'rgba(255,255,255,0.12)',
  disabled: brand.fog,
  onPrimary: brand.void,
  success: '#7DD8A8',
  warning: '#F1C27D',
  error: '#FFB4AB',
} as const;

export const colors = darkColors;

export type MeowneyColors = {
  [Key in keyof typeof darkColors]: string;
};
