import { useStore } from 'zustand';
import { expoAudioPlayerPort } from '../src/data/device/audioPlayer';
import { loadProgress, saveProgress } from '../src/data/storage/progressRepository';
import { resolveAudio } from '../lib/resolveAudio';
import { createPlayerStore } from './createPlayerStore';
import type { PlayerState } from './createPlayerStore';

const playerStore = createPlayerStore({
  resolveAudio,
  player: expoAudioPlayerPort,
  progressStorage: { load: loadProgress, save: saveProgress },
  random: Math.random,
});

export function usePlayerStore<Selected>(selector: (state: PlayerState) => Selected): Selected {
  return useStore(playerStore, selector);
}
