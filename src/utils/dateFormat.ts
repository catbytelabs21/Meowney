function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }

  return new Date(value);
}

export function formatAppDate(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatAppDateTime(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatAppDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
