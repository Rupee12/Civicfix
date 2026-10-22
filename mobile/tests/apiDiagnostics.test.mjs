import assert from 'node:assert/strict';
import test from 'node:test';
import { safeRequestUrl, sanitizeResponseBody } from '../src/api/diagnostics.ts';

test('removes credentials, query parameters, and fragments from diagnostic URLs', () => {
  assert.equal(
    safeRequestUrl('/issues?access_token=secret#private', 'https://user:password@example.test/api'),
    'https://example.test/api/issues',
  );
});

test('retains only safe response metadata and redacts message content', () => {
  const sanitized = sanitizeResponseBody({
    success: false,
    error: 'INVALID_MEDIA_UPLOAD',
    message: 'Sensitive report details',
    accessToken: 'secret',
    photos: ['private image data'],
  });

  assert.deepEqual(sanitized, {
    success: false,
    error: 'INVALID_MEDIA_UPLOAD',
    message: '[redacted]',
  });
});

test('does not expose arbitrary response fields or error strings', () => {
  assert.deepEqual(
    sanitizeResponseBody({ error: 'token=secret', coordinates: { latitude: 1, longitude: 2 } }),
    { type: 'object' },
  );
});
