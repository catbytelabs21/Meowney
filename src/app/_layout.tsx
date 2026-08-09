import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { initializeDatabase } from '@/database/database';
import { darkTheme, lightTheme } from '@/theme/theme';
import { typography } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();
initializeDatabase();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'light' ? lightTheme : darkTheme;
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
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: typography.titleWeight },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="accounts/index" options={{ title: 'Cuentas' }} />
        <Stack.Screen name="accounts/create" options={{ title: 'Nueva cuenta' }} />
        <Stack.Screen name="accounts/[id]" options={{ title: 'Cuenta' }} />
        <Stack.Screen name="transactions/create" options={{ title: 'Nueva transaccion' }} />
        <Stack.Screen name="transactions/[id]" options={{ title: 'Transaccion' }} />
        <Stack.Screen name="categories/index" options={{ title: 'Categorias' }} />
        <Stack.Screen name="categories/create" options={{ title: 'Nueva categoria' }} />
        <Stack.Screen name="savings/index" options={{ title: 'Ahorros' }} />
        <Stack.Screen name="debts/index" options={{ title: 'Deudas' }} />
      </Stack>
    </PaperProvider>
  );
}
