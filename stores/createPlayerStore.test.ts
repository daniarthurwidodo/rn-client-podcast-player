import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPlayerStore } from './createPlayerStore.ts';
import type { PlaybackStatus } from './createPlayerStore.ts';
import type { ProgressByUrl } from '../lib/playbackProgress.ts';

const TRACK_A = { url: 'https://youtu.be/aaaaaaaaaaa', title: 'A', thumbnailUrl: null };
const TRACK_B = { url: 'https://youtu.be/bbbbbbbbbbb', title: 'B', thumbnailUrl: null };
const READY_STATUS: PlaybackStatus = { isLoaded: true, isBuffering: false, playing: true, currentTime: 10, duration: 100, error: null };

function createFakes(
  resolveAudio: (url: string) => Promise<{ url: string }> = async (url) => ({ url: `audio:${url}` }),
  shouldFailEffects = false,
  shouldFailBackground = false,
  initialProgress: ProgressByUrl = {},
  shouldFailProgressSave = false,
) {
  const calls: string[] = [];
  const savedProgress: ProgressByUrl[] = [];
  let listener: (status: PlaybackStatus) => void = () => {};
  const player = {
    replace: (uri: string) => calls.push(`replace ${uri}`),
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    seekTo: async (seconds: number) => {
      calls.push(`seek ${seconds}`);
    },
    setEffectEnabled: async (effect: string, enabled: boolean) => {
      if (shouldFailEffects) throw new Error('unsupported');
      calls.push(`${effect} ${enabled}`);
    },
    enableBackgroundPlayback: async () => {
      if (shouldFailBackground) throw new Error('no audio mode');
      calls.push('background');
    },
    showLockScreenControls: (metadata: { title: string; artworkUrl: string | null }) => {
      calls.push(`lockscreen ${metadata.title} ${metadata.artworkUrl}`);
    },
    hideLockScreenControls: () => calls.push('lockscreen off'),
    requestNotificationPermission: async () => {
      calls.push('notifications');
    },
    subscribe: (next: (status: PlaybackStatus) => void) => {
      listener = next;
    },
  };
  const progressStorage = {
    load: async () => initialProgress,
    save: async (progressByUrl: ProgressByUrl) => {
      if (shouldFailProgressSave) throw new Error('disk full');
      savedProgress.push(progressByUrl);
    },
  };
  const store = createPlayerStore({ resolveAudio, player, progressStorage });
  return { store, calls, savedProgress, emitStatus: (status: PlaybackStatus) => listener(status) };
}

test('starts idle with no track', () => {
  const { store } = createFakes();
  assert.equal(store.getState().phase, 'idle');
  assert.equal(store.getState().track, null);
});

test('loadTrack resolves, loads the audio and starts playing', async () => {
  const { store, calls } = createFakes();

  await store.getState().loadTrack(TRACK_A);

  assert.equal(store.getState().phase, 'ready');
  assert.deepEqual(calls, ['pause', 'background', `replace audio:${TRACK_A.url}`, 'play', 'lockscreen A null', 'notifications']);
});

test('is in the resolving phase while the audio is being resolved', async () => {
  let finishResolving: (value: { url: string }) => void = () => {};
  const { store } = createFakes(() => new Promise((resolve) => (finishResolving = resolve)));

  const loading = store.getState().loadTrack(TRACK_A);
  assert.equal(store.getState().phase, 'resolving');
  assert.equal(store.getState().track?.title, 'A');

  finishResolving({ url: 'audio' });
  await loading;
  assert.equal(store.getState().phase, 'ready');
});

test('loading the already-loaded track again does not restart it', async () => {
  const { store, calls } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  calls.length = 0;

  await store.getState().loadTrack(TRACK_A);

  assert.deepEqual(calls, []);
});

test('moves to the error phase when resolving fails, and retries on reload', async () => {
  let shouldFail = true;
  const { store } = createFakes(async (url) => {
    if (shouldFail) throw new Error('boom');
    return { url };
  });

  await store.getState().loadTrack(TRACK_A);
  assert.equal(store.getState().phase, 'error');
  assert.ok(store.getState().errorMessage);

  shouldFail = false;
  await store.getState().loadTrack(TRACK_A);
  assert.equal(store.getState().phase, 'ready');
  assert.equal(store.getState().errorMessage, null);
});

test('a slow earlier track cannot overwrite a newer one', async () => {
  const resolvers = new Map<string, (value: { url: string }) => void>();
  const { store, calls } = createFakes((url) => new Promise((resolve) => resolvers.set(url, resolve)));

  const loadingA = store.getState().loadTrack(TRACK_A);
  const loadingB = store.getState().loadTrack(TRACK_B);
  resolvers.get(TRACK_B.url)?.({ url: 'audio-b' });
  await loadingB;
  resolvers.get(TRACK_A.url)?.({ url: 'audio-a' });
  await loadingA;

  assert.equal(store.getState().track?.title, 'B');
  assert.ok(!calls.includes('replace audio-a'));
});

test('player status updates are mirrored into the store once ready', async () => {
  const { store, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);

  emitStatus(READY_STATUS);

  const state = store.getState();
  assert.deepEqual([state.isPlaying, state.currentTime, state.duration, state.isLoaded], [true, 10, 100, true]);
});

test('status updates are ignored before the track is ready', () => {
  const { store, emitStatus } = createFakes();

  emitStatus(READY_STATUS);

  assert.equal(store.getState().currentTime, 0);
});

test('a playback error from the player moves the store to the error phase', async () => {
  const { store, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);

  emitStatus({ ...READY_STATUS, error: 'decoder failed' });

  assert.equal(store.getState().phase, 'error');
  assert.equal(store.getState().errorMessage, 'decoder failed');
});

test('togglePlayback pauses when playing and plays when paused', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(READY_STATUS);
  calls.length = 0;

  store.getState().togglePlayback();
  emitStatus({ ...READY_STATUS, playing: false });
  store.getState().togglePlayback();

  assert.deepEqual(calls, ['pause', 'play']);
});

test('togglePlayback does nothing before the track is ready', () => {
  const { store, calls } = createFakes();

  store.getState().togglePlayback();

  assert.deepEqual(calls, []);
});

test('seekToFraction seeks proportionally and clamps to the duration', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(READY_STATUS);
  calls.length = 0;

  await store.getState().seekToFraction(0.5);
  await store.getState().seekToFraction(2);
  await store.getState().seekToFraction(-1);

  assert.deepEqual(calls, ['seek 50', 'seek 100', 'seek 0']);
});

test('seekToFraction does nothing until the duration is known', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus({ ...READY_STATUS, isLoaded: false, duration: 0 });
  calls.length = 0;

  await store.getState().seekToFraction(0.5);

  assert.deepEqual(calls, []);
});

test('stop pauses and clears the track', async () => {
  const { store, calls } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  calls.length = 0;

  store.getState().stop();

  assert.deepEqual(calls, ['pause', 'lockscreen off']);
  assert.equal(store.getState().track, null);
  assert.equal(store.getState().phase, 'idle');
});

test('toggleEffect switches an effect on and back off', async () => {
  const { store, calls } = createFakes();

  await store.getState().toggleEffect('compressor');
  assert.equal(store.getState().enabledEffects.compressor, true);
  await store.getState().toggleEffect('compressor');

  assert.equal(store.getState().enabledEffects.compressor, false);
  assert.deepEqual(calls, ['compressor true', 'compressor false']);
});

test('effects are toggled independently of each other', async () => {
  const { store } = createFakes();

  await store.getState().toggleEffect('vocalBoost');

  assert.deepEqual(store.getState().enabledEffects, { compressor: false, vocalBoost: true });
});

test('toggleEffect keeps the old setting and reports an error when it fails', async () => {
  const { store } = createFakes(undefined, true);

  await store.getState().toggleEffect('vocalBoost');

  assert.equal(store.getState().enabledEffects.vocalBoost, false);
  assert.ok(store.getState().errorMessage);
});

test('effect settings survive loading another track and stop()', async () => {
  const { store } = createFakes();
  await store.getState().toggleEffect('compressor');
  await store.getState().toggleEffect('vocalBoost');

  await store.getState().loadTrack(TRACK_A);
  await store.getState().loadTrack(TRACK_B);
  store.getState().stop();

  assert.deepEqual(store.getState().enabledEffects, { compressor: true, vocalBoost: true });
});

test('background playback is enabled before the audio starts, so a locked screen keeps playing', async () => {
  const { store, calls } = createFakes();

  await store.getState().loadTrack(TRACK_A);

  assert.ok(calls.indexOf('background') < calls.indexOf('play'));
});

test('the lock screen shows the title and thumbnail of the loaded track', async () => {
  const { store, calls } = createFakes();

  await store.getState().loadTrack({ ...TRACK_A, thumbnailUrl: 'https://img.test/a.jpg' });

  assert.ok(calls.includes('lockscreen A https://img.test/a.jpg'));
});

test('does not start playing when background playback cannot be enabled', async () => {
  const { store, calls } = createFakes(undefined, false, true);

  await store.getState().loadTrack(TRACK_A);

  assert.equal(store.getState().phase, 'error');
  assert.ok(!calls.includes('play'));
});

test('asks for the notification permission once, after playback has started', async () => {
  const { store, calls } = createFakes();

  await store.getState().loadTrack(TRACK_A);
  await store.getState().loadTrack(TRACK_B);

  assert.equal(calls.filter((call) => call === 'notifications').length, 1);
  assert.ok(calls.indexOf('notifications') > calls.indexOf('play'));
});

test('does not ask for the notification permission when the track fails to load', async () => {
  const { store, calls } = createFakes(async () => {
    throw new Error('boom');
  });

  await store.getState().loadTrack(TRACK_A);

  assert.ok(!calls.includes('notifications'));
});

const IN_PROGRESS = { [TRACK_A.url]: { positionSeconds: 600, durationSeconds: 1000 } };
const COMPLETED = { [TRACK_A.url]: { positionSeconds: 995, durationSeconds: 1000 } };
const statusAt = (currentTime: number, duration = 1000): PlaybackStatus => ({ ...READY_STATUS, currentTime, duration });
const waitForStorage = () => new Promise((resolve) => setImmediate(resolve));

test('loads saved progress when created', async () => {
  const { store } = createFakes(undefined, false, false, IN_PROGRESS);

  await waitForStorage();

  assert.deepEqual(store.getState().progressByUrl, IN_PROGRESS);
});

test('saves the position each time it moves by the save step', async () => {
  const { store, emitStatus, savedProgress } = createFakes();
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(2));
  emitStatus(statusAt(6));
  emitStatus(statusAt(8));
  emitStatus(statusAt(12));

  assert.deepEqual(savedProgress.map((saved) => saved[TRACK_A.url].positionSeconds), [6, 12]);
});

test('does not save before the duration is known', async () => {
  const { store, emitStatus, savedProgress } = createFakes();
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(30, 0));

  assert.equal(savedProgress.length, 0);
});

test('saves the exact position when playback is paused', async () => {
  const { store, emitStatus, savedProgress } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(statusAt(6));
  emitStatus(statusAt(8));

  store.getState().togglePlayback();

  assert.equal(savedProgress.at(-1)?.[TRACK_A.url].positionSeconds, 8);
});

test('credits the position to the old track when switching tracks', async () => {
  const { store, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(statusAt(6));
  emitStatus(statusAt(8));

  await store.getState().loadTrack(TRACK_B);

  assert.equal(store.getState().progressByUrl[TRACK_A.url].positionSeconds, 8);
  assert.equal(store.getState().progressByUrl[TRACK_B.url], undefined);
});

test('seeks to the saved position once the audio has loaded', async () => {
  const { store, calls, emitStatus } = createFakes(undefined, false, false, IN_PROGRESS);
  await waitForStorage();
  await store.getState().loadTrack(TRACK_A);

  emitStatus({ ...statusAt(0), isLoaded: false });
  assert.equal(calls.includes('seek 600'), false);
  emitStatus(statusAt(0));

  assert.equal(calls.includes('seek 600'), true);
});

test('keeps the saved position while the resume seek has not landed', async () => {
  const { store, emitStatus, savedProgress } = createFakes(undefined, false, false, IN_PROGRESS);
  await waitForStorage();
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(0));
  emitStatus(statusAt(1));
  assert.equal(savedProgress.length, 0);

  emitStatus(statusAt(600));
  emitStatus(statusAt(606));
  assert.equal(savedProgress.at(-1)?.[TRACK_A.url].positionSeconds, 606);
});

test('does not save progress when pausing before the resume seek landed', async () => {
  const { store, savedProgress } = createFakes(undefined, false, false, IN_PROGRESS);
  await waitForStorage();
  await store.getState().loadTrack(TRACK_A);
  store.setState({ isLoaded: true, currentTime: 0, duration: 1000 });

  store.getState().stop();

  assert.equal(savedProgress.length, 0);
  assert.equal(store.getState().progressByUrl[TRACK_A.url].positionSeconds, 600);
});

test('starts a completed track from the beginning', async () => {
  const { store, calls, emitStatus } = createFakes(undefined, false, false, COMPLETED);
  await waitForStorage();
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(0));

  assert.equal(calls.some((call) => call.startsWith('seek')), false);
});

test('reports a progress save failure without stopping playback', async () => {
  const { store, emitStatus } = createFakes(undefined, false, false, {}, true);
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(10));
  await waitForStorage();

  assert.equal(store.getState().phase, 'ready');
  assert.equal(store.getState().errorMessage, 'Could not save your listening progress');
});
