import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CacheEntries } from '../models';
import { parseCacheEntries } from './parsers';

const STORAGE_KEY = 'resolved-audio';

export async function loadResolvedAudio(): Promise<CacheEntries> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  return parseCacheEntries(JSON.parse(raw));
}

export async function saveResolvedAudio(entries: CacheEntries): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
