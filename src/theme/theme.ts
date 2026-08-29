import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import {
  darkColors,
  lightColors,
  type MeowneyColorScheme,
  type MeowneyColors,
} from './colors';
import { radii } from './radii';

function createPaperColors(appColors: MeowneyColors) {
  return {
    primary: appColors.primary,
    onPrimary: appColors.onPrimary,
    secondary: appColors.secondary,
    primaryContainer: appColors.selected,
    onPrimaryContainer: appColors.text,
    secondaryContainer: appColors.selected,
    onSecondaryContainer: appColors.text,
    tertiaryContainer: appColors.selected,
    onTertiaryContainer: appColors.text,
    background: appColors.background,
    surface: appColors.surface,
    surfaceVariant: appColors.surfaceAlt,
    onSurface: appColors.text,
    onSurfaceVariant: appColors.mutedText,
    outline: appColors.border,
    error: appColors.error,
  };
}

const lightTheme = {
  ...MD3LightTheme,
  roundness: radii.button,
  colors: {
    ...MD3LightTheme.colors,
    ...createPaperColors(lightColors),
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  roundness: radii.button,
  colors: {
    ...MD3DarkTheme.colors,
    ...createPaperColors(darkColors),
  },
};

export function getMeowneyTheme(colorScheme: MeowneyColorScheme) {
  return colorScheme === 'light' ? lightTheme : darkTheme;
}
