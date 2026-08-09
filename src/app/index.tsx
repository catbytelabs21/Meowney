import { RouteScreen } from '@/components/layout/RouteScreen';

export default function IndexRoute() {
  return <RouteScreen title="Libretas" actions={[{ label: 'Ir a Dashboard', href: '/dashboard' }]} />;
}
