import { RouteScreen } from '@/components/layout/RouteScreen';

export default function DashboardRoute() {
  return <RouteScreen title="Dashboard" actions={[{ label: 'Ir a pantallas', href: '/history' }]} />;
}
