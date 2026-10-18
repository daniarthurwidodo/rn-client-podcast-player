export const NOTICE_DURATION_MS = 5000;

// start() replaces any pending expiry, so a newer message always gets its full duration.
export function createNoticeTimer(onExpire: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const start = () => {
    cancel();
    timer = setTimeout(onExpire, NOTICE_DURATION_MS);
  };

  return { start, cancel };
}
