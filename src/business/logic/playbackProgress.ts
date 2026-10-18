import type { PlaybackProgress, ProgressByUrl, SavedUrl } from '../../data/models';

export type ProgressState = 'unplayed' | 'inProgress' | 'completed';

export type LibraryFilter = 'all' | ProgressState;

export const LIBRARY_FILTERS: LibraryFilter[] = ['all', 'unplayed', 'inProgress', 'completed'];

// Below this a track counts as never started; it also is the save step while playing.
export const MIN_PLAYED_SECONDS = 5;
const COMPLETED_TAIL_SECONDS = 10;

export function getProgressState(progress: PlaybackProgress | undefined): ProgressState {
  if (!progress || progress.positionSeconds < MIN_PLAYED_SECONDS) return 'unplayed';
  const isNearEnd = progress.durationSeconds > 0 && progress.positionSeconds >= progress.durationSeconds - COMPLETED_TAIL_SECONDS;
  return isNearEnd ? 'completed' : 'inProgress';
}

export function getProgressFraction(progress: PlaybackProgress | undefined): number {
  if (!progress || progress.durationSeconds <= 0) return 0;
  return Math.min(Math.max(progress.positionSeconds / progress.durationSeconds, 0), 1);
}

export function getResumePosition(progress: PlaybackProgress | undefined): number {
  return getProgressState(progress) === 'inProgress' ? (progress?.positionSeconds ?? 0) : 0;
}

export function filterByProgress(items: SavedUrl[], progressByUrl: ProgressByUrl, filter: LibraryFilter): SavedUrl[] {
  if (filter === 'all') return items;
  return items.filter((item) => getProgressState(progressByUrl[item.url]) === filter);
}

export function countByFilter(items: SavedUrl[], progressByUrl: ProgressByUrl): Record<LibraryFilter, number> {
  return {
    all: items.length,
    unplayed: filterByProgress(items, progressByUrl, 'unplayed').length,
    inProgress: filterByProgress(items, progressByUrl, 'inProgress').length,
    completed: filterByProgress(items, progressByUrl, 'completed').length,
  };
}
