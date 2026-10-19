const WWW_PREFIX = /^www\./;

export function getHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, '');
  } catch {
    return url;
  }
}
