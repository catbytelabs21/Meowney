import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@/theme/theme';
import { typography } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
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
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: typography.titleWeight },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="accounts/index" options={{ title: 'Cuentas' }} />
        <Stack.Screen name="accounts/create" options={{ title: 'Nueva cuenta' }} />
        <Stack.Screen name="accounts/[id]" options={{ title: 'Cuenta' }} />
        <Stack.Screen name="transactions/create" options={{ title: 'Nueva transaccion' }} />
        <Stack.Screen name="transactions/[id]" options={{ title: 'Transaccion' }} />
        <Stack.Screen name="categories/index" options={{ title: 'Categorias' }} />
        <Stack.Screen name="categories/create" options={{ title: 'Nueva categoria' }} />
      </Stack>
    </PaperProvider>
  );
}
