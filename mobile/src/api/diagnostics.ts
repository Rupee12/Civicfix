export function safeRequestUrl(url: unknown, baseURL: unknown): string {
  if (typeof url !== 'string') return 'unknown';

  try {
    const base = typeof baseURL === 'string' ? `${baseURL.replace(/\/+$/, '')}/` : undefined;
    const requestPath = base && url.startsWith('/') ? url.slice(1) : url;
    const parsed = new URL(requestPath, base);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/, 1)[0] || 'unknown';
  }
}

export function sanitizeResponseBody(body: unknown): Record<string, boolean | string> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { type: body === undefined ? 'unavailable' : typeof body };
  }

  const response = body as Record<string, unknown>;
  const sanitized: Record<string, boolean | string> = {};

  if (typeof response.success === 'boolean') sanitized.success = response.success;
  if (typeof response.error === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(response.error)) {
    sanitized.error = response.error;
  }
  if (typeof response.message === 'string') sanitized.message = '[redacted]';

  return Object.keys(sanitized).length ? sanitized : { type: 'object' };
}
