export function parseMoneyToCents(value: string) {
  const normalized = value.replace(',', '.').trim();
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function formatMoneyFromCents(
  amount: number,
  currency: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat('es-MX', {
    currency,
    style: 'currency',
    ...options,
  }).format(amount / 100);
}
