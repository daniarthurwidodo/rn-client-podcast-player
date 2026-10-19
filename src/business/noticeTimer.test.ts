import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNoticeTimer, NOTICE_DURATION_MS } from './noticeTimer.ts';

test('expires after the notice duration', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let expiredCount = 0;
  createNoticeTimer(() => expiredCount++).start();

  t.mock.timers.tick(NOTICE_DURATION_MS - 1);
  assert.equal(expiredCount, 0);

  t.mock.timers.tick(1);
  assert.equal(expiredCount, 1);
});

test('starting again restarts the full duration', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let expiredCount = 0;
  const timer = createNoticeTimer(() => expiredCount++);
  timer.start();
  t.mock.timers.tick(NOTICE_DURATION_MS - 1);

  timer.start();
  t.mock.timers.tick(NOTICE_DURATION_MS - 1);
  assert.equal(expiredCount, 0);

  t.mock.timers.tick(1);
  assert.equal(expiredCount, 1);
});

test('a cancelled timer never expires', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let expiredCount = 0;
  const timer = createNoticeTimer(() => expiredCount++);
  timer.start();

  timer.cancel();
  t.mock.timers.tick(NOTICE_DURATION_MS * 2);

  assert.equal(expiredCount, 0);
});
