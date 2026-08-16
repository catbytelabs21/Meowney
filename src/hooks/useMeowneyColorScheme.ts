import { useColorScheme } from 'react-native';
import { useAppStore } from '@/stores/app.store';

export function useMeowneyColorScheme() {
  const systemColorScheme = useColorScheme();
  const themePreference = useAppStore((state) => state.themePreference);

  if (themePreference === 'light' || themePreference === 'dark') {
    return themePreference;
  }

  return systemColorScheme === 'light' ? 'light' : 'dark';
}
