import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMapCoordinate } from '../src/utils/mapCoordinates.ts';

test('accepts valid numeric latitude and longitude coordinates', () => {
  assert.deepEqual(normalizeMapCoordinate({ latitude: 12.9716, longitude: 77.5946 }), {
    latitude: 12.9716,
    longitude: 77.5946,
  });
  assert.deepEqual(normalizeMapCoordinate({ latitude: -90, longitude: 180 }), {
    latitude: -90,
    longitude: 180,
  });
});

test('rejects string, malformed, and out-of-range map coordinates', () => {
  for (const value of [
    '12.9716,77.5946',
    ['12.9716', '77.5946'],
    { latitude: '12.9716', longitude: 77.5946 },
    { latitude: Number.NaN, longitude: 77.5946 },
    { latitude: 91, longitude: 77.5946 },
    { latitude: 12.9716, longitude: -181 },
    null,
  ]) {
    assert.equal(normalizeMapCoordinate(value), null);
  }
});
