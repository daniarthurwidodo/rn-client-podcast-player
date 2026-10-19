import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toWholeSeconds } from './wholeSeconds.ts';

test('floors fractional seconds', () => {
  assert.equal(toWholeSeconds(65.9), 65);
});

test('returns 0 for negative, NaN and infinite values', () => {
  assert.equal(toWholeSeconds(-3), 0);
  assert.equal(toWholeSeconds(Number.NaN), 0);
  assert.equal(toWholeSeconds(Number.POSITIVE_INFINITY), 0);
});
