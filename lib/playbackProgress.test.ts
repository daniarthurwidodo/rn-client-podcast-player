import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countByFilter,
  filterByProgress,
  getProgressFraction,
  getProgressState,
  getResumePosition,
  parseProgressByUrl,
} from './playbackProgress.ts';

const UNPLAYED_ITEM = { url: 'https://youtu.be/u', title: 'U', thumbnailUrl: null };
const STARTED_ITEM = { url: 'https://youtu.be/s', title: 'S', thumbnailUrl: null };
const FINISHED_ITEM = { url: 'https://youtu.be/f', title: 'F', thumbnailUrl: null };
const ITEMS = [UNPLAYED_ITEM, STARTED_ITEM, FINISHED_ITEM];
const PROGRESS = {
  [STARTED_ITEM.url]: { positionSeconds: 600, durationSeconds: 1000 },
  [FINISHED_ITEM.url]: { positionSeconds: 995, durationSeconds: 1000 },
};

test('classifies missing, barely started, partial and finished progress', () => {
  assert.equal(getProgressState(undefined), 'unplayed');
  assert.equal(getProgressState({ positionSeconds: 4, durationSeconds: 100 }), 'unplayed');
  assert.equal(getProgressState({ positionSeconds: 50, durationSeconds: 100 }), 'inProgress');
  assert.equal(getProgressState({ positionSeconds: 95, durationSeconds: 100 }), 'completed');
});

test('does not mark a track completed while its duration is unknown', () => {
  assert.equal(getProgressState({ positionSeconds: 50, durationSeconds: 0 }), 'inProgress');
});

test('fraction is clamped and zero without a duration', () => {
  assert.equal(getProgressFraction(undefined), 0);
  assert.equal(getProgressFraction({ positionSeconds: 5, durationSeconds: 0 }), 0);
  assert.equal(getProgressFraction({ positionSeconds: 25, durationSeconds: 100 }), 0.25);
  assert.equal(getProgressFraction({ positionSeconds: 150, durationSeconds: 100 }), 1);
});

test('resumes only in-progress tracks; completed and unplayed start from zero', () => {
  assert.equal(getResumePosition({ positionSeconds: 50, durationSeconds: 100 }), 50);
  assert.equal(getResumePosition({ positionSeconds: 99, durationSeconds: 100 }), 0);
  assert.equal(getResumePosition(undefined), 0);
});

test('filters the library by progress state', () => {
  assert.deepEqual(filterByProgress(ITEMS, PROGRESS, 'all'), ITEMS);
  assert.deepEqual(filterByProgress(ITEMS, PROGRESS, 'unplayed'), [UNPLAYED_ITEM]);
  assert.deepEqual(filterByProgress(ITEMS, PROGRESS, 'inProgress'), [STARTED_ITEM]);
  assert.deepEqual(filterByProgress(ITEMS, PROGRESS, 'completed'), [FINISHED_ITEM]);
});

test('counts the library per filter', () => {
  assert.deepEqual(countByFilter(ITEMS, PROGRESS), { all: 3, unplayed: 1, inProgress: 1, completed: 1 });
  assert.deepEqual(countByFilter([], {}), { all: 0, unplayed: 0, inProgress: 0, completed: 0 });
});

test('parses stored progress and drops malformed entries', () => {
  const raw = { good: { positionSeconds: 1, durationSeconds: 2 }, bad: { positionSeconds: 'x' }, worse: null };
  assert.deepEqual(parseProgressByUrl(raw), { good: { positionSeconds: 1, durationSeconds: 2 } });
});

test('parses non-object storage values as empty', () => {
  assert.deepEqual(parseProgressByUrl(null), {});
  assert.deepEqual(parseProgressByUrl([1]), {});
  assert.deepEqual(parseProgressByUrl('x'), {});
});
