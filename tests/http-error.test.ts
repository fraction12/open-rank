import { describe, expect, it } from 'vitest';
import { noticeFromException, noticeFromResponse } from '../src/lib/http-error';

describe('http-error notices', () => {
  it('maps 500 responses to error notices', async () => {
    const response = new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const notice = await noticeFromResponse(response, 'Fallback message');

    expect(notice.level).toBe('error');
    expect(notice.title).toBe('Server error');
    expect(notice.message).toBe('Database unavailable');
    expect(notice.status).toBe(500);
  });

  it('maps 404 responses to info notices', async () => {
    const response = new Response(JSON.stringify({ message: 'Leaderboard not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    const notice = await noticeFromResponse(response, 'Fallback message');

    expect(notice.level).toBe('info');
    expect(notice.title).toBe('Not found');
    expect(notice.message).toBe('Leaderboard not found');
  });

  it('falls back for non-json responses', async () => {
    const response = new Response('Bad gateway', {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });

    const notice = await noticeFromResponse(response, 'Service temporarily unavailable.');

    expect(notice.level).toBe('error');
    expect(notice.message).toBe('Service temporarily unavailable.');
  });

  it('maps TypeError exceptions to network errors', () => {
    const notice = noticeFromException(new TypeError('Failed to fetch'), 'Fallback');

    expect(notice.level).toBe('error');
    expect(notice.title).toBe('Network error');
  });

  it('maps AbortError to info notices', () => {
    const notice = noticeFromException(new DOMException('Aborted', 'AbortError'), 'Fallback');

    expect(notice.level).toBe('info');
    expect(notice.title).toBe('Request canceled');
  });
});
