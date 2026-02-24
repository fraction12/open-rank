import { describe, expect, it, vi } from 'vitest';

const toastMocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastWarning: vi.fn(),
}));

const httpMocks = vi.hoisted(() => ({
  noticeFromException: vi.fn(() => ({
    level: 'error',
    title: 'Unexpected error',
    message: 'fallback',
  })),
}));

vi.mock('../src/lib/toast', () => toastMocks);
vi.mock('../src/lib/http-error', () => httpMocks);

import { normalizeNotice, showNotice } from '../src/lib/notify';

describe('notify helpers', () => {
  it('routes warning notices to warning toasts', () => {
    showNotice({ level: 'warning', title: 'Request issue', message: 'Validation failed' });
    expect(toastMocks.toastWarning).toHaveBeenCalledWith('Request issue', 'Validation failed');
  });

  it('routes info notices to info toasts', () => {
    showNotice({ level: 'info', title: 'Not found', message: 'No results' });
    expect(toastMocks.toastInfo).toHaveBeenCalledWith('Not found', 'No results');
  });

  it('routes error notices to error toasts', () => {
    showNotice({ level: 'error', title: 'Server error', message: 'Retry later' });
    expect(toastMocks.toastError).toHaveBeenCalledWith('Server error', 'Retry later');
  });

  it('returns notice-shaped errors without remapping', () => {
    const notice = { level: 'info', title: 'Notice', message: 'Message' };
    expect(normalizeNotice(notice, 'fallback')).toEqual(notice);
    expect(httpMocks.noticeFromException).not.toHaveBeenCalled();
  });

  it('falls back to exception mapping for unknown errors', () => {
    const mapped = normalizeNotice(new Error('boom'), 'fallback');
    expect(httpMocks.noticeFromException).toHaveBeenCalled();
    expect(mapped.title).toBe('Unexpected error');
  });
});
