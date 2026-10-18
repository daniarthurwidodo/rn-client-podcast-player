import { useState } from 'react';
import type { SavedUrl } from '../src/data/models';

// Tracks the item by URL so the sheet always shows its latest genres while they are being edited.
export function useGenreEditor(savedUrls: SavedUrl[]) {
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const editingItem = savedUrls.find((saved) => saved.url === editingUrl) ?? null;

  return { editingItem, open: (item: SavedUrl) => setEditingUrl(item.url), close: () => setEditingUrl(null) };
}
