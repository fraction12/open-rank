export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function jsonError(
  message: string,
  status = 400,
  code = 'BAD_REQUEST',
  headers: Record<string, string> = {},
  extra: Record<string, unknown> = {},
): Response {
  return json({ error: message, code, ...extra }, status, headers);
}
