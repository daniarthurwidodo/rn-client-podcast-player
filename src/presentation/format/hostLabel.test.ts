import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHostLabel } from './hostLabel.ts';

test('returns the hostname without the www prefix', () => {
  assert.equal(getHostLabel('https://www.youtube.com/watch?v=abc'), 'youtube.com');
  assert.equal(getHostLabel('https://youtu.be/abc'), 'youtu.be');
});

test('falls back to the raw value when it is not a URL', () => {
  assert.equal(getHostLabel('not a url'), 'not a url');
  assert.equal(getHostLabel(''), '');
});
