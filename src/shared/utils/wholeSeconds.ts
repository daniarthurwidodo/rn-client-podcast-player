export const SECONDS_PER_MINUTE = 60;

export function toWholeSeconds(totalSeconds: number): number {
  return Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
}
