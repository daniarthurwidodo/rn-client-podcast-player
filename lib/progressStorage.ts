import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseProgressByUrl } from './playbackProgress';
import type { ProgressByUrl } from './playbackProgress';

const STORAGE_KEY = 'playback-progress';

export async function loadProgress(): Promise<ProgressByUrl> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  return parseProgressByUrl(JSON.parse(raw));
}

export async function saveProgress(progressByUrl: ProgressByUrl): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progressByUrl));
}
