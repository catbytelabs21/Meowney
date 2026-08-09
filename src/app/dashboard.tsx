import { RouteScreen } from '@/components/layout/RouteScreen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';

export default function DashboardRoute() {
  const { from, notebookId } = useLocalSearchParams<{ from?: string; notebookId?: string }>();
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = notebookId ?? selectedNotebookId;
  const loadNotebookName = useCallback(
    () =>
      selectedNotebookName ??
      (activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.name ?? null : null),
    [activeNotebookId, selectedNotebookName],
  );
  const { data: activeNotebookName } = useDeferredQuery(loadNotebookName, selectedNotebookName);
  const openedFromMore = from === 'more';

  useEffect(() => {
    if (notebookId) {
      setSelectedNotebookId(notebookId);
    }
  }, [notebookId, setSelectedNotebookId]);

  return (
    <>
      <AppHeader
        title={activeNotebookName ?? 'Dashboard'}
        left={
          <AppHeaderActionButton
            accessibilityLabel={openedFromMore ? 'Regresar a mas' : 'Ir a libretas'}
            icon={openedFromMore ? 'arrow-left' : 'notebook-outline'}
            onPress={() => (openedFromMore ? router.push('/more') : router.replace('/notebooks'))}
          />
        }
      />
      <RouteScreen
        title="Dashboard"
        actions={[
          {
            label: 'Ir a pantallas',
            href: { pathname: '/history', params: activeNotebookId ? { notebookId: activeNotebookId } : undefined },
          },
        ]}
      />
    </>
  );
}
