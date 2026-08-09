import { AppHeaderActionButton } from './AppHeaderActionButton';
import { useAppStore } from '@/stores/app.store';

export function AppSettingsButton() {
  const openSettingsPanel = useAppStore((state) => state.openSettingsPanel);

  return (
    <AppHeaderActionButton
      accessibilityLabel="Abrir ajustes"
      icon="cog-outline"
      onPress={openSettingsPanel}
    />
  );
}
