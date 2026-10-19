import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTICE_DURATION_MS } from '../../shared/utils/noticeTimer.ts';
import { createPlayerStore, PLAYBACK_RATES } from './createPlayerStore.ts';
import type { ProgressByUrl } from '../../data/models.ts';
import type { PlaybackStatus } from '../../data/ports.ts';

const TRACK_A = { url: 'https://youtu.be/aaaaaaaaaaa', title: 'A', thumbnailUrl: null, genres: [] };
const TRACK_B = { url: 'https://youtu.be/bbbbbbbbbbb', title: 'B', thumbnailUrl: null, genres: [] };
const READY_STATUS: PlaybackStatus = { isLoaded: true, isBuffering: false, playing: true, didJustFinish: false, currentTime: 10, duration: 100, error: null };

function createFakes(
  resolveAudio: (url: string, options?: { refresh?: boolean }) => Promise<{ url: string }> = async (url) => ({ url: `audio:${url}` }),
  shouldFailEffects = false,
  shouldFailBackground = false,
  initialProgress: ProgressByUrl = {},
  shouldFailProgressSave = false,
  random: () => number = () => 0,
) {
  let isSeekFailing = false;
  const calls: string[] = [];
  const savedProgress: ProgressByUrl[] = [];
  let listener: (status: PlaybackStatus) => void = () => {};
  const player = {
    replace: (uri: string) => calls.push(`replace ${uri}`),
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    seekTo: async (seconds: number) => {
      if (isSeekFailing) throw new Error('seek failed');
      calls.push(`seek ${seconds}`);
    },
    setPlaybackRate: (rate: number) => calls.push(`rate ${rate}`),
    setLoop: (isLooping: boolean) => calls.push(`loop ${isLooping}`),
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
  const store = createPlayerStore({ resolveAudio, player, progressStorage, random });
  return {
    store,
    calls,
    savedProgress,
    emitStatus: (status: PlaybackStatus) => listener(status),
    setSeekFailing: (isFailing: boolean) => (isSeekFailing = isFailing),
  };
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

test('toggleEffect keeps the old setting and shows a notice when it fails', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { store } = createFakes(undefined, true);

  await store.getState().toggleEffect('vocalBoost');

  assert.equal(store.getState().enabledEffects.vocalBoost, false);
  assert.ok(store.getState().notice);
  assert.equal(store.getState().errorMessage, null);
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

test('reports a progress save failure without stopping playback', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { store, emitStatus } = createFakes(undefined, false, false, {}, true);
  await store.getState().loadTrack(TRACK_A);

  emitStatus(statusAt(10));
  await waitForStorage();

  assert.equal(store.getState().phase, 'ready');
  assert.equal(store.getState().notice, 'Could not save your listening progress');
  assert.equal(store.getState().errorMessage, null);
});

const seeksIn = (calls: string[]) => calls.filter((call) => call.startsWith('seek'));

test('skips forward and back from the current position', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(statusAt(100));

  await store.getState().skipBySeconds(30);
  await store.getState().skipBySeconds(-15);

  assert.deepEqual(seeksIn(calls), ['seek 130', 'seek 85']);
});

test('keeps a skip inside the track', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(statusAt(5));
  await store.getState().skipBySeconds(-15);
  emitStatus(statusAt(990));
  await store.getState().skipBySeconds(30);

  assert.deepEqual(seeksIn(calls), ['seek 0', 'seek 1000']);
});

test('ignores skips before the audio has loaded', async () => {
  const { store, calls } = createFakes();
  await store.getState().skipBySeconds(30);
  await store.getState().loadTrack(TRACK_A);
  await store.getState().skipBySeconds(30);

  assert.deepEqual(seeksIn(calls), []);
});

test('cycles the playback rate through the list and wraps around', () => {
  const { store, calls } = createFakes();

  for (let step = 0; step < PLAYBACK_RATES.length; step += 1) store.getState().cyclePlaybackRate();

  assert.deepEqual(calls, ['rate 1.25', 'rate 1.5', 'rate 2', 'rate 0.75', 'rate 1']);
  assert.equal(store.getState().playbackRate, 1);
});

test('applies the chosen rate to the next track and keeps it after stop', async () => {
  const { store, calls } = createFakes();
  store.getState().cyclePlaybackRate();

  await store.getState().loadTrack(TRACK_A);
  store.getState().stop();

  assert.equal(calls.filter((call) => call === 'rate 1.25').length, 2);
  assert.equal(store.getState().playbackRate, 1.25);
});

test('does not touch the rate when it is the default', async () => {
  const { store, calls } = createFakes();

  await store.getState().loadTrack(TRACK_A);

  assert.equal(calls.some((call) => call.startsWith('rate')), false);
});

async function createReadyStoreWithFailingSeek(t: { mock: { timers: { enable: (options: { apis: 'setTimeout'[] }) => void } } }) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fakes = createFakes();
  await fakes.store.getState().loadTrack(TRACK_A);
  fakes.emitStatus(statusAt(10));
  fakes.setSeekFailing(true);
  return fakes;
}

test('a failed seek shows a notice and keeps the track playable', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);

  await store.getState().skipBySeconds(30);

  assert.ok(store.getState().notice);
  assert.equal(store.getState().phase, 'ready');
  assert.equal(store.getState().errorMessage, null);
});

test('a notice clears itself after the notice duration', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);

  t.mock.timers.tick(NOTICE_DURATION_MS - 1);
  assert.ok(store.getState().notice);

  t.mock.timers.tick(1);
  assert.equal(store.getState().notice, null);
});

test('a second notice restarts the timer instead of being cleared early', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);
  t.mock.timers.tick(NOTICE_DURATION_MS - 1);

  await store.getState().skipBySeconds(30);
  t.mock.timers.tick(NOTICE_DURATION_MS - 1);

  assert.ok(store.getState().notice);
});

test('a successful seek clears the seek notice at once', async (t) => {
  const { store, setSeekFailing } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);

  setSeekFailing(false);
  await store.getState().skipBySeconds(30);

  assert.equal(store.getState().notice, null);
});

test('clearNotice dismisses the notice', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);

  store.getState().clearNotice();

  assert.equal(store.getState().notice, null);
});

test('stop clears the notice', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);

  store.getState().stop();

  assert.equal(store.getState().notice, null);
});

test('loading another track clears the notice', async (t) => {
  const { store } = await createReadyStoreWithFailingSeek(t);
  await store.getState().skipBySeconds(30);

  await store.getState().loadTrack(TRACK_B);

  assert.equal(store.getState().notice, null);
});

test('a fatal error stays until the track is reloaded', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { store } = createFakes(async () => {
    throw new Error('offline');
  });
  await store.getState().loadTrack(TRACK_A);

  t.mock.timers.tick(NOTICE_DURATION_MS * 2);

  assert.equal(store.getState().phase, 'error');
  assert.ok(store.getState().errorMessage);
});

function createRecordingResolver(failuresBeforeSuccess: number) {
  const refreshFlags: boolean[] = [];
  const resolveAudio = async (url: string, options?: { refresh?: boolean }) => {
    refreshFlags.push(options?.refresh ?? false);
    if (refreshFlags.length <= failuresBeforeSuccess) throw new Error('offline');
    return { url: `audio:${url}` };
  };
  return { resolveAudio, refreshFlags };
}

test('a normal load lets the resolver use its cache', async () => {
  const { resolveAudio, refreshFlags } = createRecordingResolver(0);
  const { store } = createFakes(resolveAudio);

  await store.getState().loadTrack(TRACK_A);

  assert.deepEqual(refreshFlags, [false]);
});

test('retrying a failed track bypasses the resolver cache', async () => {
  const { resolveAudio, refreshFlags } = createRecordingResolver(1);
  const { store } = createFakes(resolveAudio);
  await store.getState().loadTrack(TRACK_A);

  await store.getState().loadTrack(TRACK_A);

  assert.deepEqual(refreshFlags, [false, true]);
  assert.equal(store.getState().phase, 'ready');
});

test('loading a different track after a failure still uses the cache', async () => {
  const { resolveAudio, refreshFlags } = createRecordingResolver(1);
  const { store } = createFakes(resolveAudio);
  await store.getState().loadTrack(TRACK_A);

  await store.getState().loadTrack(TRACK_B);

  assert.deepEqual(refreshFlags, [false, false]);
});

const TRACK_C = { url: 'https://youtu.be/ccccccccccc', title: 'C', thumbnailUrl: null, genres: [] };
const finishedStatus = (): PlaybackStatus => ({ ...READY_STATUS, playing: false, currentTime: 99, duration: 100, didJustFinish: true });
const replacesIn = (calls: string[]) => calls.filter((call) => call.startsWith('replace'));
const letLoadSettle = () => new Promise((resolve) => setImmediate(resolve));

async function startQueue(tracks = [TRACK_A, TRACK_B], shuffle = false, random: () => number = () => 0) {
  const fakes = createFakes(undefined, false, false, {}, false, random);
  await fakes.store.getState().playQueue(tracks, { shuffle });
  fakes.emitStatus(READY_STATUS);
  return fakes;
}

test('playQueue plays the first track in library order and keeps the rest queued', async () => {
  const { store, calls } = await startQueue([TRACK_A, TRACK_B, TRACK_C]);

  assert.equal(store.getState().track?.title, 'A');
  assert.deepEqual(store.getState().queue?.tracks.map((track) => track.title), ['A', 'B', 'C']);
  assert.deepEqual(replacesIn(calls), [`replace audio:${TRACK_A.url}`]);
});

test('playQueue with shuffle uses the random order', async () => {
  const { store } = await startQueue([TRACK_A, TRACK_B, TRACK_C], true);

  assert.deepEqual(store.getState().queue?.tracks.map((track) => track.title), ['B', 'C', 'A']);
  assert.equal(store.getState().track?.title, 'B');
  assert.equal(store.getState().isShuffled, true);
});

test('playQueue with no tracks does nothing', async () => {
  const { store } = createFakes();

  await store.getState().playQueue([], { shuffle: false });

  assert.equal(store.getState().queue, null);
  assert.equal(store.getState().track, null);
});

test('when a track finishes the next queued track starts', async () => {
  const { store, calls, emitStatus } = await startQueue();

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.equal(store.getState().track?.title, 'B');
  assert.equal(store.getState().queue?.index, 1);
  assert.deepEqual(replacesIn(calls), [`replace audio:${TRACK_A.url}`, `replace audio:${TRACK_B.url}`]);
});

test('the finished track is saved as completed before the next one loads', async () => {
  const { store, emitStatus } = await startQueue();

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.deepEqual(store.getState().progressByUrl[TRACK_A.url], { positionSeconds: 99, durationSeconds: 100 });
});

test('the queue ends after the last track when repeat is off', async () => {
  const { store, calls, emitStatus } = await startQueue([TRACK_A]);

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.equal(store.getState().queue, null);
  assert.equal(replacesIn(calls).length, 1);
});

test('a finished track without a queue does not load anything else', async () => {
  const { store, calls, emitStatus } = createFakes();
  await store.getState().loadTrack(TRACK_A);
  emitStatus(READY_STATUS);

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.equal(replacesIn(calls).length, 1);
});

test('picking another track by hand ends the queue, reopening the current one keeps it', async () => {
  const { store } = await startQueue();

  await store.getState().loadTrack(TRACK_A);
  assert.ok(store.getState().queue);

  await store.getState().loadTrack(TRACK_C);
  assert.equal(store.getState().queue, null);
});

test('retrying a failed queue track keeps the queue', async () => {
  const { resolveAudio } = createRecordingResolver(1);
  const { store } = createFakes(resolveAudio);
  await store.getState().playQueue([TRACK_A, TRACK_B], { shuffle: false });
  assert.equal(store.getState().phase, 'error');

  await store.getState().loadTrack(TRACK_A);

  assert.equal(store.getState().phase, 'ready');
  assert.equal(store.getState().queue?.tracks.length, 2);
});

test('stop clears the queue', async () => {
  const { store } = await startQueue();

  store.getState().stop();

  assert.equal(store.getState().queue, null);
});

test('playNext moves to the next queued track', async () => {
  const { store } = await startQueue();

  await store.getState().playNext();

  assert.equal(store.getState().track?.title, 'B');
});

test('playNext on the last track does nothing and keeps the queue', async () => {
  const { store, calls } = await startQueue([TRACK_A]);

  await store.getState().playNext();

  assert.ok(store.getState().queue);
  assert.equal(replacesIn(calls).length, 1);
});

test('playNext without a queue does nothing', async () => {
  const { store } = createFakes();

  await store.getState().playNext();

  assert.equal(store.getState().track, null);
});

test('playPrevious goes back to the previous queued track', async () => {
  const { store, emitStatus } = await startQueue();
  emitStatus(finishedStatus());
  await letLoadSettle();

  await store.getState().playPrevious();

  assert.equal(store.getState().track?.title, 'A');
});

test('playPrevious on the first track restarts it', async () => {
  const { store, calls } = await startQueue();

  await store.getState().playPrevious();

  assert.ok(calls.includes('seek 0'));
  assert.equal(store.getState().track?.title, 'A');
});

test('playQueueTrack jumps to a queued track and keeps the queue order', async () => {
  const { store } = await startQueue([TRACK_A, TRACK_B, TRACK_C]);

  await store.getState().playQueueTrack(2);

  assert.equal(store.getState().track?.title, 'C');
  assert.equal(store.getState().queue?.index, 2);
  assert.deepEqual(store.getState().queue?.tracks.map((track) => track.title), ['A', 'B', 'C']);
});

test('playQueueTrack ignores the current track, positions outside the queue and a missing queue', async () => {
  const { store, calls } = await startQueue([TRACK_A, TRACK_B]);

  await store.getState().playQueueTrack(0);
  await store.getState().playQueueTrack(5);
  await store.getState().playQueueTrack(-1);

  assert.equal(replacesIn(calls).length, 1);

  const withoutQueue = createFakes();
  await withoutQueue.store.getState().playQueueTrack(0);
  assert.equal(withoutQueue.store.getState().track, null);
});

const loopCallsIn = (calls: string[]) => calls.filter((call) => call.startsWith('loop'));

test('cycleRepeat goes off, all, one and back to off', async () => {
  const { store } = await startQueue();

  const modes = [store.getState().repeatMode];
  for (let press = 0; press < 3; press++) {
    store.getState().cycleRepeat();
    modes.push(store.getState().repeatMode);
  }

  assert.deepEqual(modes, ['off', 'all', 'one', 'off']);
});

test('repeat one turns the player loop on, and leaving it turns it off', async () => {
  const { store, calls } = await startQueue();

  store.getState().cycleRepeat();
  assert.deepEqual(loopCallsIn(calls), []);

  store.getState().cycleRepeat();
  assert.deepEqual(loopCallsIn(calls), ['loop true']);

  store.getState().cycleRepeat();
  assert.deepEqual(loopCallsIn(calls), ['loop true', 'loop false']);
});

test('repeat one keeps looping when the next queue track is loaded by hand', async () => {
  const { store, calls } = await startQueue([TRACK_A, TRACK_B, TRACK_C]);
  store.getState().cycleRepeat();
  store.getState().cycleRepeat();

  await store.getState().playNext();

  assert.equal(store.getState().track?.title, 'B');
  assert.deepEqual(loopCallsIn(calls), ['loop true']);
});

test('stop turns the loop off', async () => {
  const { store, calls } = await startQueue();
  store.getState().cycleRepeat();
  store.getState().cycleRepeat();

  store.getState().stop();

  assert.deepEqual(loopCallsIn(calls), ['loop true', 'loop false']);
});

test('picking another track by hand ends the queue and its loop', async () => {
  const { store, calls } = await startQueue();
  store.getState().cycleRepeat();
  store.getState().cycleRepeat();

  await store.getState().loadTrack(TRACK_C);

  assert.deepEqual(loopCallsIn(calls), ['loop true', 'loop false']);
});

test('a one-track queue repeating all loops that track', async () => {
  const { store, calls } = await startQueue([TRACK_A]);

  store.getState().cycleRepeat();

  assert.deepEqual(loopCallsIn(calls), ['loop true']);
});

test('repeat all wraps from the last track back to the first', async () => {
  const { store, emitStatus } = await startQueue();
  store.getState().cycleRepeat();
  emitStatus(finishedStatus());
  await letLoadSettle();
  emitStatus(READY_STATUS);

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.equal(store.getState().track?.title, 'A');
  assert.equal(store.getState().queue?.index, 0);
});

test('toggleShuffle keeps the current track playing and puts it first', async () => {
  const { store, calls } = await startQueue([TRACK_A, TRACK_B, TRACK_C]);
  await store.getState().playQueueTrack(1);
  const replacesBefore = replacesIn(calls).length;

  store.getState().toggleShuffle();

  assert.equal(store.getState().isShuffled, true);
  assert.deepEqual(store.getState().queue?.tracks.map((track) => track.title), ['B', 'C', 'A']);
  assert.equal(store.getState().queue?.index, 0);
  assert.equal(store.getState().track?.title, 'B');
  assert.equal(replacesIn(calls).length, replacesBefore);
});

test('toggleShuffle off restores library order around the current track', async () => {
  const { store } = await startQueue([TRACK_A, TRACK_B, TRACK_C], true);

  store.getState().toggleShuffle();

  assert.equal(store.getState().isShuffled, false);
  assert.deepEqual(store.getState().queue?.tracks.map((track) => track.title), ['A', 'B', 'C']);
  assert.equal(store.getState().queue?.index, 1);
});

test('toggleShuffle without a queue does nothing', () => {
  const { store } = createFakes();

  store.getState().toggleShuffle();

  assert.equal(store.getState().isShuffled, false);
  assert.equal(store.getState().queue, null);
});

test('while a queue track plays, the next track is resolved ahead of time without bypassing the cache', async () => {
  const { resolveAudio, refreshFlags } = createRecordingResolver(0);
  const urlsResolved: string[] = [];
  const recordingResolver = async (url: string, options?: { refresh?: boolean }) => {
    urlsResolved.push(url);
    return resolveAudio(url, options);
  };
  const { store } = createFakes(recordingResolver);

  await store.getState().playQueue([TRACK_A, TRACK_B, TRACK_C], { shuffle: false });

  assert.deepEqual(urlsResolved, [TRACK_A.url, TRACK_B.url]);
  assert.deepEqual(refreshFlags, [false, false]);
});

test('nothing is resolved ahead on the last track or without a queue', async () => {
  const urlsResolved: string[] = [];
  const resolver = async (url: string) => {
    urlsResolved.push(url);
    return { url: `audio:${url}` };
  };
  const { store } = createFakes(resolver);

  await store.getState().loadTrack(TRACK_A);
  await store.getState().playQueue([TRACK_B], { shuffle: false });

  assert.deepEqual(urlsResolved, [TRACK_A.url, TRACK_B.url]);
});

test('a failed resolve-ahead is ignored and the next track still plays when its turn comes', async () => {
  let failNext = true;
  const resolver = async (url: string) => {
    if (url === TRACK_B.url && failNext) {
      failNext = false;
      throw new Error('offline');
    }
    return { url: `audio:${url}` };
  };
  const { store, emitStatus } = createFakes(resolver);
  await store.getState().playQueue([TRACK_A, TRACK_B], { shuffle: false });
  emitStatus(READY_STATUS);
  assert.equal(store.getState().phase, 'ready');

  emitStatus(finishedStatus());
  await letLoadSettle();

  assert.equal(store.getState().track?.title, 'B');
  assert.equal(store.getState().phase, 'ready');
});
