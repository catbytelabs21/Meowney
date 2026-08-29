import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useMemo } from 'react';
import { StatusBar, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { AppSettingsPanel } from '@/components/layout/AppSettingsPanel';
import { bootstrapStarterData } from '@/database/bootstrap';
import { initializeDatabase } from '@/database/database';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { useAppStore } from '@/stores/app.store';
import { motion } from '@/theme/motion';
import { getMeowneyTheme } from '@/theme/theme';

void SplashScreen.preventAutoHideAsync();
initializeDatabase();
bootstrapStarterData();
useAppStore.getState().hydrateSettings();

export const unstable_settings = {
  initialRouteName: 'index',
};

const stackRoutes = [
  'index',
  'notebooks/index',
  '(tabs)',
  'accounts/index',
  'accounts/create',
  'accounts/[id]',
  'budgets/index',
  'categories/index',
  'categories/create',
  'savings/index',
  'subscriptions/index',
] as const;

export default function RootLayout() {
  const colorScheme = useMeowneyColorScheme();
  const theme = getMeowneyTheme(colorScheme);
  const navigationTheme = useMemo(
    () => ({
      ...(colorScheme === 'light' ? DefaultTheme : DarkTheme),
      colors: {
        ...(colorScheme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.onSurface,
        border: theme.colors.outline,
        notification: theme.colors.secondary,
      },
    }),
    [colorScheme, theme],
  );
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navigationTheme}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <StatusBar
            barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'}
            backgroundColor={theme.colors.background}
            translucent={false}
          />
          <Stack
            initialRouteName="index"
            screenOptions={{
              animation: 'ios_from_right',
              animationDuration: motion.screenTransitionDuration,
              animationMatchesGesture: true,
              gestureEnabled: true,
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            {stackRoutes.map((name) => (
              <Stack.Screen key={name} name={name} />
            ))}
          </Stack>
          <AppSettingsPanel />
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}
