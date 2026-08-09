import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { View, type ColorValue, useColorScheme } from 'react-native';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors } from '@/theme/colors';

export const unstable_settings = {
  initialRouteName: 'history',
};

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: TabIconName) {
  return function Icon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const isNotebooksRoute = pathname === '/notebooks';
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const loadNotebookName = useCallback(
    () =>
      selectedNotebookName ??
      (selectedNotebookId ? notebookRepository.getActiveById(selectedNotebookId)?.name ?? null : null),
    [selectedNotebookId, selectedNotebookName],
  );
  const { data: activeNotebookName } = useDeferredQuery(loadNotebookName, selectedNotebookName);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title={isNotebooksRoute ? 'Meowney' : activeNotebookName ?? 'Meowney'}
        left={
          isNotebooksRoute ? undefined : (
            <AppHeaderActionButton
              accessibilityLabel="Ir a libretas"
              icon="notebook-outline"
              onPress={() => router.replace('/notebooks')}
            />
          )
        }
      />
      <Tabs
        initialRouteName="history"
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          display: isNotebooksRoute ? 'none' : 'flex',
          position: 'absolute',
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        }}
      >
      <Tabs.Screen
        name="notebooks"
        options={{ href: null, title: 'Libretas', tabBarIcon: tabIcon('notebook-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historial', tabBarIcon: tabIcon('history') }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Movimientos', tabBarIcon: tabIcon('swap-horizontal') }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ title: 'Presupuestos', tabBarIcon: tabIcon('chart-donut') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'Mas', tabBarIcon: tabIcon('dots-horizontal-circle-outline') }}
      />
      </Tabs>
    </View>
  );
}
