import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors } from '@/theme/colors';

export const unstable_settings = {
  initialRouteName: 'home',
};

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: TabIconName) {
  return function Icon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home-outline') }}
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
        name="goals"
        options={{ title: 'Metas', tabBarIcon: tabIcon('flag-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ajustes', tabBarIcon: tabIcon('cog-outline') }}
      />
    </Tabs>
  );
}
