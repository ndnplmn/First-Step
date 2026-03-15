export function generatePatientId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `#${year}-${num}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
