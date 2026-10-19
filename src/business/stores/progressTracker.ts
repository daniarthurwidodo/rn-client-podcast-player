import type { AudioPlayerPort, PlaybackStatus, ProgressStoragePort } from '../../data/ports.ts';
import { getResumePosition, MIN_PLAYED_SECONDS } from '../playback/playbackProgress.ts';
import type { Notices } from './notices.ts';
import { PROGRESS_LOAD_ERROR_MESSAGE, PROGRESS_SAVE_ERROR_MESSAGE, SEEK_ERROR_MESSAGE } from './playerMessages.ts';
import type { StoreAccess } from './playerState.ts';

type ProgressTrackerDependencies = {
  store: StoreAccess;
  player: AudioPlayerPort;
  progressStorage: ProgressStoragePort;
  notices: Notices;
};

export type ProgressTracker = ReturnType<typeof createProgressTracker>;

// Saves where the user stopped and seeks back there when the track is opened again.
export function createProgressTracker({ store, player, progressStorage, notices }: ProgressTrackerDependencies) {
  // While set, position updates are not saved: until the resume seek lands they report 0 and would overwrite the saved position.
  let resumeSeconds: number | null = null;
  let isResumeSeekIssued = false;

  const recordProgress = async (url: string, positionSeconds: number, durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

    const progressByUrl = { ...store.getState().progressByUrl, [url]: { positionSeconds, durationSeconds } };
    store.setState({ progressByUrl });
    try {
      await progressStorage.save(progressByUrl);
      notices.clearNoticeIfShowing(PROGRESS_SAVE_ERROR_MESSAGE);
    } catch {
      notices.showNotice(PROGRESS_SAVE_ERROR_MESSAGE);
    }
  };

  // Called before the player stops reporting this track, so the position is not credited to the next one.
  const flush = () => {
    const { track, phase, isLoaded, currentTime, duration } = store.getState();
    if (!track || phase !== 'ready' || !isLoaded || resumeSeconds !== null) return;
    recordProgress(track.url, currentTime, duration);
  };

  const resumeFromSavedPosition = async (status: PlaybackStatus, targetSeconds: number) => {
    if (isResumeSeekIssued) {
      if (Math.abs(status.currentTime - targetSeconds) < MIN_PLAYED_SECONDS) resumeSeconds = null;
      return;
    }
    if (!status.isLoaded) return;

    isResumeSeekIssued = true;
    try {
      await player.seekTo(targetSeconds);
    } catch {
      resumeSeconds = null;
      notices.showNotice(SEEK_ERROR_MESSAGE);
    }
  };

  const saveProgressStep = (status: PlaybackStatus) => {
    const { track, progressByUrl } = store.getState();
    if (!track || !status.isLoaded) return;

    const savedPosition = progressByUrl[track.url]?.positionSeconds ?? 0;
    if (Math.abs(status.currentTime - savedPosition) < MIN_PLAYED_SECONDS) return;
    recordProgress(track.url, status.currentTime, status.duration);
  };

  const hydrate = async () => {
    try {
      const savedProgress = await progressStorage.load();
      store.setState({ progressByUrl: { ...savedProgress, ...store.getState().progressByUrl } });
    } catch {
      notices.showNotice(PROGRESS_LOAD_ERROR_MESSAGE);
    }
  };

  const beginTrack = (url: string) => {
    const resumePosition = getResumePosition(store.getState().progressByUrl[url]);
    resumeSeconds = resumePosition > 0 ? resumePosition : null;
    isResumeSeekIssued = false;
  };

  const cancelResume = () => {
    resumeSeconds = null;
  };

  const handleStatus = (status: PlaybackStatus) => {
    if (resumeSeconds !== null) resumeFromSavedPosition(status, resumeSeconds);
    else saveProgressStep(status);
  };

  return { flush, hydrate, beginTrack, cancelResume, handleStatus };
}
