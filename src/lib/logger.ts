type Level = 'info' | 'warn' | 'error';

export function log(level: Level, message: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  };
  // In production, Vercel captures stdout as structured logs
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
