import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors } from '@/theme/colors';

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
  return (
    <Tabs
      initialRouteName="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
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
  );
}
