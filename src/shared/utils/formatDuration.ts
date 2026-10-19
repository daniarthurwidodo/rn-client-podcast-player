import { SECONDS_PER_MINUTE, toWholeSeconds } from './wholeSeconds.ts';

const MINUTES_PER_HOUR = 60;

export function formatDuration(totalSeconds: number): string {
  const wholeSeconds = toWholeSeconds(totalSeconds);
  const totalMinutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  if (totalMinutes === 0) return `${wholeSeconds}s`;

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
