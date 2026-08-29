export function createRepositoryId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}
