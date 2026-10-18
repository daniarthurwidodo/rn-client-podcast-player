import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTime } from './formatTime.ts';

test('formats seconds as m:ss', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5), '0:05');
  assert.equal(formatTime(65), '1:05');
});

test('rolls minutes past 59 instead of adding hours', () => {
  assert.equal(formatTime(75 * 60 + 3), '75:03');
});

test('drops fractional seconds', () => {
  assert.equal(formatTime(9.99), '0:09');
});

test('treats negative, NaN and infinite values as zero', () => {
  assert.equal(formatTime(-4), '0:00');
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '0:00');
});
