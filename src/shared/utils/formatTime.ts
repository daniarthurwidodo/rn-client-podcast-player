import { SECONDS_PER_MINUTE, toWholeSeconds } from './wholeSeconds.ts';

const SECONDS_PAD_LENGTH = 2;

export function formatTime(totalSeconds: number): string {
  const wholeSeconds = toWholeSeconds(totalSeconds);
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  const seconds = String(wholeSeconds % SECONDS_PER_MINUTE).padStart(SECONDS_PAD_LENGTH, '0');
  return `${minutes}:${seconds}`;
}
