import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from '../src/lib/database';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E',
    secondary: '#2563EB',
    background: '#F7FAF9',
    surface: '#FFFFFF',
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      initializeDatabase();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Meowney' }} />
      </Stack>
    </PaperProvider>
  );
}
