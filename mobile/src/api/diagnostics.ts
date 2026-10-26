export function safeRequestUrl(url: unknown, baseURL: unknown): string {
  if (typeof url !== 'string') return 'unknown';

  try {
    const base = typeof baseURL === 'string' ? `${baseURL.replace(/\/+$/, '')}/` : undefined;
    const requestPath = base && url.startsWith('/') ? url.slice(1) : url;
    const parsed = new URL(requestPath, base);
    const pathname = parsed.pathname.replace(/[a-f\d]{24}/gi, ':id');
    return `${parsed.origin}${pathname}`;
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
  const safeErrorCodes = new Set([
    'AUTHENTICATION_REQUIRED',
    'DATABASE_UNAVAILABLE',
    'DUPLICATE_CANDIDATES',
    'FORBIDDEN',
    'INTERNAL_SERVER_ERROR',
    'INVALID_MEDIA_TYPE',
    'INVALID_MEDIA_UPLOAD',
    'INVALID_TOKEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
  ]);

  if (typeof response.success === 'boolean') sanitized.success = response.success;
  if (typeof response.error === 'string' && safeErrorCodes.has(response.error)) {
    sanitized.error = response.error;
  }
  if (typeof response.message === 'string') sanitized.message = '[redacted]';

  return Object.keys(sanitized).length ? sanitized : { type: 'object' };
}

export function classifyApiFailure(input: {
  status?: number;
  code?: string;
  isUpload?: boolean;
}): string {
  if (typeof input.status === 'number') return `HTTP_${input.status}`;
  if (input.code === 'ECONNABORTED' || input.code === 'ETIMEDOUT') return 'TIMEOUT';
  if (input.code === 'ERR_NETWORK' || input.code === 'ENETUNREACH' || input.code === 'ECONNREFUSED') {
    return 'NETWORK_ERROR';
  }
  if (input.isUpload) return 'UPLOAD_ERROR';
  return 'UNKNOWN';
}

export function isReportApiUrl(url: string): boolean {
  return getReportApiStage(url) !== undefined;
}

export function getReportApiStage(url: string): 'duplicate-check' | 'issue-create' | 'issue-support' | undefined {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    if (pathname === '/api/issues/check-duplicates') return 'duplicate-check';
    if (pathname === '/api/issues') return 'issue-create';
    if (/^\/api\/issues\/(?:[a-f\d]{24}|:id)\/support$/i.test(pathname)) return 'issue-support';
    return undefined;
  } catch {
    return undefined;
  }
}

export function tokenPresence(token: unknown): 'yes' | 'no' {
  return typeof token === 'string' && token.length > 0 ? 'yes' : 'no';
}
