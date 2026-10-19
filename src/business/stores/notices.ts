import { createNoticeTimer } from '../../shared/utils/noticeTimer.ts';
import type { StoreAccess } from './playerState.ts';

export type Notices = ReturnType<typeof createNotices>;

export function createNotices(store: StoreAccess) {
  const timer = createNoticeTimer(() => clearNotice());

  const clearNotice = () => {
    timer.cancel();
    store.setState({ notice: null });
  };

  const showNotice = (message: string) => {
    store.setState({ notice: message });
    timer.start();
  };

  const clearNoticeIfShowing = (message: string) => {
    if (store.getState().notice === message) clearNotice();
  };

  return { clearNotice, showNotice, clearNoticeIfShowing };
}
