export function checkTaskStale(staleTask: number, createdAt: string) {
  const days = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const staleToDays = Math.floor(staleTask ?? 0 / (1000 * 60 * 60 * 24));
  return days >= staleToDays;
}
