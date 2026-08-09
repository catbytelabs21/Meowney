import { RouteScreen } from '@/components/layout/RouteScreen';

export default function MoreRoute() {
  return (
    <RouteScreen
      title="Mas"
      actions={[
        { label: 'Cuentas', href: '/accounts' },
        { label: 'Categorias', href: '/categories' },
        { label: 'Ahorros', href: '/savings' },
        { label: 'Deudas', href: '/debts' },
      ]}
    />
  );
}
