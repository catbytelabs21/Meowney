import { RouteScreen } from '@/components/layout/RouteScreen';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/app.store';

export default function DashboardRoute() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = notebookId ?? selectedNotebookId;

  useEffect(() => {
    if (notebookId) {
      setSelectedNotebookId(notebookId);
    }
  }, [notebookId, setSelectedNotebookId]);

  return (
    <RouteScreen
      title="Dashboard"
      actions={[
        {
          label: 'Ir a pantallas',
          href: { pathname: '/history', params: activeNotebookId ? { notebookId: activeNotebookId } : undefined },
        },
      ]}
    />
  );
}
