import { router } from 'expo-router';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { RouteScreen } from '@/components/layout/RouteScreen';

export default function DebtsRoute() {
  return (
    <RouteScreen
      headerTitle="Deudas"
      headerLeft={
        <AppHeaderActionButton
          accessibilityLabel="Regresar a mas"
          icon="arrow-left"
          onPress={() => router.push('/more')}
        />
      }
      title="Deudas"
    />
  );
}
