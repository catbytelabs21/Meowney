import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { useCallback } from 'react';
import { Easing, View, type ColorValue } from 'react-native';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors } from '@/theme/colors';
import { motion } from '@/theme/motion';

export const unstable_settings = {
  initialRouteName: 'more',
};

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: TabIconName) {
  return function Icon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
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
        title={activeNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Ir a libretas"
            icon="notebook-outline"
            onPress={() => router.dismissTo('/notebooks')}
          />
        }
      />
      <Tabs
        initialRouteName="more"
        screenOptions={{
          animation: 'shift',
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedText,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          sceneStyle: {
            backgroundColor: colors.background,
          },
          transitionSpec: {
            animation: 'timing',
            config: {
              duration: motion.tabTransitionDuration,
              easing: Easing.out(Easing.cubic),
            },
          },
        }}
      >
        <Tabs.Screen
          name="history-movements"
          options={{ title: 'Movimientos', tabBarIcon: tabIcon('swap-vertical') }}
        />
        <Tabs.Screen
          name="more"
          options={{ title: 'Mi libreta', tabBarIcon: tabIcon('book-open-page-variant-outline') }}
        />
        <Tabs.Screen
          name="balance"
          options={{ title: 'Mi dinero', tabBarIcon: tabIcon('wallet-outline') }}
        />
      </Tabs>
    </View>
  );
}


