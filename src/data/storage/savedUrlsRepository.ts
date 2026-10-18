import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedUrl } from '../models';
import { parseSavedUrls } from './parsers';

const STORAGE_KEY = 'saved-urls';

export async function loadSavedUrls(): Promise<SavedUrl[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  return parseSavedUrls(JSON.parse(raw));
}

export async function saveSavedUrls(savedUrls: SavedUrl[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedUrls));
}
