import { noticeFromException, type Notice } from './http-error';
import { toastError, toastInfo, toastWarning } from './toast';

export function showNotice(notice: Notice): void {
  if (notice.level === 'warning') {
    toastWarning(notice.title, notice.message);
    return;
  }

  if (notice.level === 'info') {
    toastInfo(notice.title, notice.message);
    return;
  }

  toastError(notice.title, notice.message);
}

export function normalizeNotice(error: unknown, fallbackMessage: string): Notice {
  if (
    error &&
    typeof error === 'object' &&
    'level' in error &&
    'title' in error &&
    'message' in error
  ) {
    return error as Notice;
  }

  return noticeFromException(error, fallbackMessage);
}
