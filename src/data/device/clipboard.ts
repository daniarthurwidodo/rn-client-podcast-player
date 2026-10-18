import * as Clipboard from 'expo-clipboard';

export function readClipboardText(): Promise<string> {
  return Clipboard.getStringAsync();
}
