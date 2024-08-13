import ms from "ms";

function calculateDaysDifference(date1: Date, date2: Date): number {
  const millisecondsPerDay = ms("1d");
  return Math.floor((date1.getTime() - date2.getTime()) / millisecondsPerDay);
}

export function checkTaskStale(staleTaskMilliseconds: number, createdAt: string): boolean {
  if (staleTaskMilliseconds === 0) {
    return false;
  }

  const currentDate = new Date();
  const createdDate = new Date(createdAt);
  const daysSinceCreation = calculateDaysDifference(currentDate, createdDate);
  const staleDaysThreshold = Math.floor(staleTaskMilliseconds / ms("1d"));

  return daysSinceCreation >= staleDaysThreshold && staleDaysThreshold > 0;
}
