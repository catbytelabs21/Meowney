import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useMemo } from 'react';
import { StatusBar, View, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { AppSettingsPanel } from '@/components/layout/AppSettingsPanel';
import { initializeDatabase } from '@/database/database';
import { darkTheme, lightTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();
initializeDatabase();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'light' ? lightTheme : darkTheme;
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
      SplashScreen.hideAsync();
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
              animation: 'none',
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="accounts/index" />
            <Stack.Screen name="accounts/create" />
            <Stack.Screen name="accounts/[id]" />
            <Stack.Screen name="transactions/create" />
            <Stack.Screen name="transactions/[id]" />
            <Stack.Screen name="categories/index" />
            <Stack.Screen name="categories/create" />
            <Stack.Screen name="savings/index" />
            <Stack.Screen name="debts/index" />
          </Stack>
          <AppSettingsPanel />
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}
