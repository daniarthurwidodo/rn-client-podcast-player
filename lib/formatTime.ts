const SECONDS_PER_MINUTE = 60;
const SECONDS_PAD_LENGTH = 2;

export function formatTime(totalSeconds: number): string {
  const wholeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  const seconds = String(wholeSeconds % SECONDS_PER_MINUTE).padStart(SECONDS_PAD_LENGTH, '0');
  return `${minutes}:${seconds}`;
}
