import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSelectedReportAssets,
  getReportImageResizeAction,
  isReportImageAsset,
  isValidReportPhotoSize,
  isValidReportPhotoUri,
  MAX_REPORT_IMAGE_DIMENSION,
  MAX_REPORT_PHOTO_BYTES,
} from '../src/utils/reportMedia.ts';

test('accepts local file and content URIs but rejects non-local or malformed URIs', () => {
  assert.equal(isValidReportPhotoUri('file:///data/user/0/civicfix/photo.jpg'), true);
  assert.equal(isValidReportPhotoUri('content://media/external/photo/42'), true);
  assert.equal(isValidReportPhotoUri('data:image/jpeg;base64,secret'), false);
  assert.equal(isValidReportPhotoUri('https://example.test/photo.jpg'), false);
  assert.equal(isValidReportPhotoUri(''), false);
});

test('accepts images and rejects non-image and unsupported picker assets', () => {
  assert.equal(isReportImageAsset({ type: 'image', mimeType: 'image/heic' }), true);
  assert.equal(isReportImageAsset({ mimeType: 'image/jpeg' }), true);
  assert.equal(isReportImageAsset({ type: 'video', mimeType: 'video/mp4' }), false);
  assert.equal(isReportImageAsset({ type: 'image', mimeType: 'application/pdf' }), false);
  assert.equal(isReportImageAsset({}), false);
});

test('accepts only positive compressed output sizes up to the backend limit', () => {
  assert.equal(isValidReportPhotoSize(1), true);
  assert.equal(isValidReportPhotoSize(MAX_REPORT_PHOTO_BYTES), true);
  assert.equal(isValidReportPhotoSize(MAX_REPORT_PHOTO_BYTES + 1), false);
  assert.equal(isValidReportPhotoSize(0), false);
  assert.equal(isValidReportPhotoSize(Number.NaN), false);
});

test('treats picker cancellation as an empty selection', () => {
  assert.deepEqual(getSelectedReportAssets({ canceled: true, assets: null }), []);
  assert.deepEqual(getSelectedReportAssets({ canceled: false, assets: ['photo'] }), ['photo']);
});

test('resizes only oversized images while preserving portrait or landscape direction', () => {
  assert.deepEqual(getReportImageResizeAction(1200, 900), []);
  assert.deepEqual(getReportImageResizeAction(4000, 3000), [{ resize: { width: MAX_REPORT_IMAGE_DIMENSION } }]);
  assert.deepEqual(getReportImageResizeAction(3000, 4000), [{ resize: { height: MAX_REPORT_IMAGE_DIMENSION } }]);
  assert.deepEqual(getReportImageResizeAction(0, 4000), []);
});
