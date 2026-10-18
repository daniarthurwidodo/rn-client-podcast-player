import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from './formatDuration.ts';

test('formats under a minute as seconds', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
});

test('formats minutes and hours', () => {
  assert.equal(formatDuration(15 * 60), '15m');
  assert.equal(formatDuration(60 * 60), '1h 0m');
  assert.equal(formatDuration(102 * 60 + 30), '1h 42m');
});

test('treats negative, NaN and infinite values as zero', () => {
  assert.equal(formatDuration(-4), '0s');
  assert.equal(formatDuration(Number.NaN), '0s');
  assert.equal(formatDuration(Number.POSITIVE_INFINITY), '0s');
});
