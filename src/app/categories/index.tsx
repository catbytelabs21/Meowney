import { router } from 'expo-router';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { RouteScreen } from '@/components/layout/RouteScreen';

export default function CategoriesRoute() {
  return (
    <RouteScreen
      headerTitle="Categorias"
      headerLeft={
        <AppHeaderActionButton
          accessibilityLabel="Regresar a mas"
          icon="arrow-left"
          onPress={() => router.push('/more')}
        />
      }
      title="Categorias"
    />
  );
}
