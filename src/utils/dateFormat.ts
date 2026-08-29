function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function parseDate(value: string) {
  if (isDateKey(value)) {
    return new Date(`${value}T12:00:00`);
  }

  return new Date(value);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function formatAppDate(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDateParts(date);
}

export function formatAppDateTime(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDateParts(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateParts(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
