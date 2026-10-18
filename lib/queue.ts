import type { SavedUrl } from './savedUrl';

export type RepeatMode = 'off' | 'all' | 'one';

export type QueueState = { tracks: SavedUrl[]; index: number };

type RandomSource = () => number;

type NextStepOptions = { queue: QueueState; repeatMode: RepeatMode; isShuffled: boolean; random: RandomSource };

type PreviousStepOptions = { queue: QueueState; repeatMode: RepeatMode };

const NEXT_REPEAT_MODE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

export function cycleRepeatMode(mode: RepeatMode): RepeatMode {
  return NEXT_REPEAT_MODE[mode];
}

// Fisher–Yates on a copy; the random source is injected so tests are deterministic.
export function shuffleItems<Item>(items: Item[], random: RandomSource): Item[] {
  const shuffled = [...items];
  for (let position = shuffled.length - 1; position > 0; position--) {
    const swapWith = Math.floor(random() * (position + 1));
    [shuffled[position], shuffled[swapWith]] = [shuffled[swapWith], shuffled[position]];
  }
  return shuffled;
}

export function buildQueue(items: SavedUrl[], shouldShuffle: boolean, random: RandomSource): SavedUrl[] {
  return shouldShuffle ? shuffleItems(items, random) : [...items];
}

// A one-track queue repeating all is the same as repeating that track, and the player's own loop does it without reloading.
export function isLoopingTrack(queue: QueueState | null, repeatMode: RepeatMode): boolean {
  if (!queue) return false;
  return repeatMode === 'one' || (repeatMode === 'all' && queue.tracks.length === 1);
}

// Switching shuffle mid-playback keeps the current track playing: shuffled puts it first, unshuffled restores library order.
export function reorderQueue(source: SavedUrl[], current: SavedUrl, shouldShuffle: boolean, random: RandomSource): QueueState {
  if (!shouldShuffle) return { tracks: [...source], index: Math.max(source.findIndex((track) => track.url === current.url), 0) };

  const others = source.filter((track) => track.url !== current.url);
  return { tracks: [current, ...shuffleItems(others, random)], index: 0 };
}

// A new lap must not open with the track that just finished.
function reshuffleAfter(tracks: SavedUrl[], lastPlayed: SavedUrl, random: RandomSource): SavedUrl[] {
  const reshuffled = shuffleItems(tracks, random);
  if (reshuffled.length > 1 && reshuffled[0].url === lastPlayed.url) {
    [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]];
  }
  return reshuffled;
}

// Returns null when the queue has ended. 'one' wraps like 'all' here: a manual Next still moves on, and the
// player's own loop handles repeating a single track.
export function getNextStep({ queue, repeatMode, isShuffled, random }: NextStepOptions): QueueState | null {
  const { tracks, index } = queue;
  if (tracks.length === 0) return null;
  if (index + 1 < tracks.length) return { tracks, index: index + 1 };
  if (repeatMode === 'off') return null;

  const nextTracks = isShuffled ? reshuffleAfter(tracks, tracks[index], random) : tracks;
  return { tracks: nextTracks, index: 0 };
}

export function getPreviousStep({ queue, repeatMode }: PreviousStepOptions): QueueState | null {
  const { tracks, index } = queue;
  if (tracks.length === 0) return null;
  if (index > 0) return { tracks, index: index - 1 };
  return repeatMode === 'off' ? null : { tracks, index: tracks.length - 1 };
}
