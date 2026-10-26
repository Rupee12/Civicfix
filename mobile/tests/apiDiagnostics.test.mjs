import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyApiFailure,
  getReportApiStage,
  safeRequestUrl,
  sanitizeResponseBody,
  tokenPresence,
} from '../src/api/diagnostics.ts';

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

test('classifies network, timeout, HTTP, upload, and unknown failures', () => {
  assert.equal(classifyApiFailure({ code: 'ETIMEDOUT' }), 'TIMEOUT');
  assert.equal(classifyApiFailure({ code: 'ERR_NETWORK' }), 'NETWORK_ERROR');
  assert.equal(classifyApiFailure({ status: 413, isUpload: true }), 'HTTP_413');
  assert.equal(classifyApiFailure({ isUpload: true }), 'UPLOAD_ERROR');
  assert.equal(classifyApiFailure({}), 'UNKNOWN');
});

test('identifies report stages and logs token presence without token values', () => {
  assert.equal(getReportApiStage('https://example.test/api/issues/check-duplicates'), 'duplicate-check');
  assert.equal(getReportApiStage('https://example.test/api/issues'), 'issue-create');
  assert.equal(getReportApiStage('https://example.test/api/issues/0123456789abcdef01234567/support'), 'issue-support');
  assert.equal(getReportApiStage(safeRequestUrl('/issues/0123456789abcdef01234567/support', 'https://example.test/api')), 'issue-support');
  assert.equal(tokenPresence('secret-token'), 'yes');
  assert.equal(tokenPresence(undefined), 'no');
});
