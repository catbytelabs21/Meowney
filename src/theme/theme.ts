import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { darkColors, lightColors, type MeowneyColors } from './colors';
import { radii } from './radii';

function createPaperColors(appColors: MeowneyColors) {
  return {
    primary: appColors.primary,
    onPrimary: appColors.onPrimary,
    secondary: appColors.secondary,
    background: appColors.background,
    surface: appColors.surface,
    surfaceVariant: appColors.surfaceAlt,
    onSurface: appColors.text,
    onSurfaceVariant: appColors.mutedText,
    outline: appColors.border,
    error: appColors.error,
  };
}

export const lightTheme = {
  ...MD3LightTheme,
  roundness: radii.button,
  colors: {
    ...MD3LightTheme.colors,
    ...createPaperColors(lightColors),
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: radii.button,
  colors: {
    ...MD3DarkTheme.colors,
    ...createPaperColors(darkColors),
  },
};

export const theme = darkTheme;

export type MeowneyTheme = typeof darkTheme;
