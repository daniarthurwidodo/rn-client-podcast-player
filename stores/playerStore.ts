import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { PermissionsAndroid, Platform } from 'react-native';
import { useStore } from 'zustand';
import { loadProgress, saveProgress } from '../lib/progressStorage';
import { resolveAudio } from '../lib/resolveAudio';
import { setEffectEnabled } from '../modules/audio-effects';
import { createPlayerStore } from './createPlayerStore';
import type { AudioPlayerPort, PlayerState } from './createPlayerStore';

const NOTIFICATION_PERMISSION_MIN_API_LEVEL = 33;

const audioPlayer = createAudioPlayer(null);

const expoAudioPlayerPort: AudioPlayerPort = {
  replace: (uri) => audioPlayer.replace({ uri }),
  play: () => audioPlayer.play(),
  pause: () => audioPlayer.pause(),
  seekTo: (seconds) => audioPlayer.seekTo(seconds),
  setPlaybackRate: (rate) => audioPlayer.setPlaybackRate(rate),
  setLoop: (isLooping) => {
    audioPlayer.loop = isLooping;
  },
  setEffectEnabled: (effect, enabled) => setEffectEnabled(audioPlayer.id, effect, enabled),
  // doNotMix is required for the lock-screen controls to attach to this player.
  // playsInSilentMode must be explicit: expo-audio refuses play() on Android while the ringer is on vibrate/mute.
  enableBackgroundPlayback: () =>
    setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: 'doNotMix', playsInSilentMode: true }),
  showLockScreenControls: ({ title, artworkUrl }) =>
    audioPlayer.setActiveForLockScreen(true, artworkUrl ? { title, artworkUrl } : { title }),
  hideLockScreenControls: () => audioPlayer.clearLockScreenControls(),
  // Android 13+ needs this for the lock-screen media notification; a denial never affects playback.
  requestNotificationPermission: async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < NOTIFICATION_PERMISSION_MIN_API_LEVEL) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  },
  subscribe: (listener) => {
    audioPlayer.addListener('playbackStatusUpdate', listener);
  },
};

const playerStore = createPlayerStore({
  resolveAudio,
  player: expoAudioPlayerPort,
  progressStorage: { load: loadProgress, save: saveProgress },
  random: Math.random,
});

export function usePlayerStore<Selected>(selector: (state: PlayerState) => Selected): Selected {
  return useStore(playerStore, selector);
}
