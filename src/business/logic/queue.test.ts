import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQueue, cycleRepeatMode, getNextStep, getPreviousStep, isLoopingTrack, reorderQueue, shuffleItems } from './queue.ts';

const track = (name: string) => ({ url: `https://youtu.be/${name}`, title: name, thumbnailUrl: null, genres: [] });
const [A, B, C] = [track('a'), track('b'), track('c')];
const urls = (tracks: { url: string }[]) => tracks.map((item) => item.url);

// Always 0 makes Fisher–Yates move the first element to the end each step: [a,b,c] -> [b,c,a].
const alwaysZero = () => 0;
const neverShuffle = () => {
  throw new Error('random must not be used');
};

test('cycleRepeatMode goes off, all, one and back to off', () => {
  assert.equal(cycleRepeatMode('off'), 'all');
  assert.equal(cycleRepeatMode('all'), 'one');
  assert.equal(cycleRepeatMode('one'), 'off');
});

test('shuffleItems returns a permutation and leaves the input untouched', () => {
  const items = [A, B, C];

  const shuffled = shuffleItems(items, alwaysZero);

  assert.deepEqual(urls(shuffled).sort(), urls(items).sort());
  assert.deepEqual(urls(items), urls([A, B, C]));
});

test('shuffleItems is deterministic for a fixed random source', () => {
  assert.deepEqual(urls(shuffleItems([A, B, C], alwaysZero)), urls([B, C, A]));
});

test('shuffleItems handles empty and single-item lists', () => {
  assert.deepEqual(shuffleItems([], alwaysZero), []);
  assert.deepEqual(urls(shuffleItems([A], alwaysZero)), urls([A]));
});

test('buildQueue keeps library order when not shuffling and never touches the random source', () => {
  assert.deepEqual(urls(buildQueue([A, B, C], false, neverShuffle)), urls([A, B, C]));
});

test('buildQueue shuffles when asked', () => {
  assert.deepEqual(urls(buildQueue([A, B, C], true, alwaysZero)), urls([B, C, A]));
});

test('getNextStep moves to the next track', () => {
  const step = getNextStep({ queue: { tracks: [A, B, C], index: 0 }, repeatMode: 'off', isShuffled: false, random: neverShuffle });

  assert.equal(step?.index, 1);
});

test('getNextStep ends the queue after the last track when repeat is off', () => {
  const step = getNextStep({ queue: { tracks: [A, B], index: 1 }, repeatMode: 'off', isShuffled: false, random: neverShuffle });

  assert.equal(step, null);
});

test('getNextStep wraps to the start when repeating all', () => {
  const step = getNextStep({ queue: { tracks: [A, B], index: 1 }, repeatMode: 'all', isShuffled: false, random: neverShuffle });

  assert.deepEqual(step && { order: urls(step.tracks), index: step.index }, { order: urls([A, B]), index: 0 });
});

test('getNextStep treats repeat one like repeat all for a manual Next', () => {
  const step = getNextStep({ queue: { tracks: [A, B], index: 1 }, repeatMode: 'one', isShuffled: false, random: neverShuffle });

  assert.equal(step?.index, 0);
});

test('getNextStep reshuffles when a shuffled queue wraps', () => {
  const step = getNextStep({ queue: { tracks: [A, B, C], index: 2 }, repeatMode: 'all', isShuffled: true, random: alwaysZero });

  assert.deepEqual(step && urls(step.tracks), urls([B, C, A]));
});

const randomFrom = (values: number[]) => {
  let position = 0;
  return () => values[position++];
};
// With these values a plain shuffle of [a, b, c] gives [c, b, a], i.e. it would open with the track that just played.
const SHUFFLE_OPENING_WITH_LAST = [0, 0.99];

test('a reshuffled lap never opens with the track that just played', () => {
  assert.equal(shuffleItems([A, B, C], randomFrom(SHUFFLE_OPENING_WITH_LAST))[0].url, C.url);

  const step = getNextStep({
    queue: { tracks: [A, B, C], index: 2 },
    repeatMode: 'all',
    isShuffled: true,
    random: randomFrom(SHUFFLE_OPENING_WITH_LAST),
  });

  assert.notEqual(step?.tracks[0].url, C.url);
});

test('a one-track queue repeating all stays on that track', () => {
  const step = getNextStep({ queue: { tracks: [A], index: 0 }, repeatMode: 'all', isShuffled: true, random: alwaysZero });

  assert.deepEqual(step && { order: urls(step.tracks), index: step.index }, { order: urls([A]), index: 0 });
});

test('getNextStep and getPreviousStep return null for an empty queue', () => {
  assert.equal(getNextStep({ queue: { tracks: [], index: 0 }, repeatMode: 'all', isShuffled: false, random: neverShuffle }), null);
  assert.equal(getPreviousStep({ queue: { tracks: [], index: 0 }, repeatMode: 'all' }), null);
});

test('getPreviousStep moves back one track', () => {
  assert.equal(getPreviousStep({ queue: { tracks: [A, B, C], index: 2 }, repeatMode: 'off' })?.index, 1);
});

test('getPreviousStep stops at the first track when repeat is off', () => {
  assert.equal(getPreviousStep({ queue: { tracks: [A, B], index: 0 }, repeatMode: 'off' }), null);
});

test('getPreviousStep wraps to the last track when repeating', () => {
  assert.equal(getPreviousStep({ queue: { tracks: [A, B, C], index: 0 }, repeatMode: 'all' })?.index, 2);
});

test('isLoopingTrack loops for repeat one and for a one-track queue repeating all', () => {
  assert.equal(isLoopingTrack({ tracks: [A, B], index: 0 }, 'one'), true);
  assert.equal(isLoopingTrack({ tracks: [A], index: 0 }, 'all'), true);
});

test('isLoopingTrack does not loop otherwise', () => {
  assert.equal(isLoopingTrack({ tracks: [A, B], index: 0 }, 'all'), false);
  assert.equal(isLoopingTrack({ tracks: [A], index: 0 }, 'off'), false);
  assert.equal(isLoopingTrack(null, 'one'), false);
});

test('reorderQueue shuffled keeps the current track first and shuffles the rest', () => {
  const queue = reorderQueue([A, B, C], B, true, alwaysZero);

  assert.deepEqual({ order: urls(queue.tracks), index: queue.index }, { order: urls([B, C, A]), index: 0 });
});

test('reorderQueue unshuffled restores library order around the current track', () => {
  const queue = reorderQueue([A, B, C], C, false, neverShuffle);

  assert.deepEqual({ order: urls(queue.tracks), index: queue.index }, { order: urls([A, B, C]), index: 2 });
});

test('reorderQueue still works when the current track is not in the source', () => {
  assert.equal(reorderQueue([A, B], C, false, neverShuffle).index, 0);
  assert.deepEqual(urls(reorderQueue([A, B], C, true, alwaysZero).tracks), urls([C, B, A]));
});
