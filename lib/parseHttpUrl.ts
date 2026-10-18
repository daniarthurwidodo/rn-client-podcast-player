const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export function parseHttpUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const { protocol } = new URL(trimmed);
    return ALLOWED_PROTOCOLS.includes(protocol) ? trimmed : null;
  } catch {
    return null;
  }
}
