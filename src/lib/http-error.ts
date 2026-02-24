export type NoticeLevel = 'error' | 'warning' | 'info';

export interface Notice {
  level: NoticeLevel;
  title: string;
  message: string;
  status?: number;
}

type JsonRecord = Record<string, unknown>;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as JsonRecord;

  const candidates = [obj.message, obj.error, obj.details, obj.hint];
  for (const candidate of candidates) {
    if (hasText(candidate)) return candidate;
  }

  return null;
}

function levelForStatus(status: number): NoticeLevel {
  if (status >= 500) return 'error';
  if (status === 404) return 'info';
  if (status >= 400) return 'warning';
  return 'error';
}

function titleForStatus(status: number): string {
  if (status >= 500) return 'Server error';
  if (status === 429) return 'Rate limit reached';
  if (status === 401) return 'Sign in required';
  if (status === 403) return 'Request blocked';
  if (status === 404) return 'Not found';
  if (status >= 400) return 'Request issue';
  return 'Unexpected error';
}

export async function noticeFromResponse(response: Response, fallbackMessage: string): Promise<Notice> {
  let message = fallbackMessage;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = await response.json();
      message = extractMessage(payload) ?? fallbackMessage;
    } catch {
      message = fallbackMessage;
    }
  }

  return {
    level: levelForStatus(response.status),
    title: titleForStatus(response.status),
    message,
    status: response.status,
  };
}

export function noticeFromException(error: unknown, fallbackMessage: string): Notice {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      level: 'info',
      title: 'Request canceled',
      message: 'The request was canceled.',
    };
  }

  if (error instanceof TypeError) {
    return {
      level: 'error',
      title: 'Network error',
      message: 'Unable to reach the server. Check your connection and try again.',
    };
  }

  return {
    level: 'error',
    title: 'Unexpected error',
    message: fallbackMessage,
  };
}
