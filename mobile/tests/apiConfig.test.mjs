import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ApiConfigurationError, PRODUCTION_API_BASE_URL, resolveApiBaseUrl } from '../src/api/apiConfig.ts';
import appConfigFactory from '../app.config.ts';

const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const appConfig = appConfigFactory({});

test('configures fingerprint-compatible EAS Update without blocking app launch', () => {
  assert.equal(appConfig.updates?.url, 'https://u.expo.dev/69557ef5-6fdd-44fa-977f-df78b0b00509');
  assert.equal(appConfig.updates?.checkAutomatically, 'ON_LOAD');
  assert.equal(appConfig.updates?.fallbackToCacheTimeout, 0);
  assert.deepEqual(appConfig.runtimeVersion, { policy: 'fingerprint' });
  assert.ok(appConfig.plugins?.includes('expo-updates'));
  assert.equal(appConfig.android?.package, 'com.civicfix.mobile');
  assert.equal(appConfig.extra?.eas?.projectId, '69557ef5-6fdd-44fa-977f-df78b0b00509');
});

test('always includes the Maps plugin and conditionally configures its Android key', () => {
  const mapsPlugin = (config) => config.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-maps',
  );

  const previousKey = process.env.GOOGLE_MAPS_API_KEY;
  try {
    delete process.env.GOOGLE_MAPS_API_KEY;
    assert.deepEqual(mapsPlugin(appConfigFactory({})), ['react-native-maps', {}]);

    process.env.GOOGLE_MAPS_API_KEY = 'test-only-maps-key';
    assert.deepEqual(mapsPlugin(appConfigFactory({})), [
      'react-native-maps',
      { androidGoogleMapsApiKey: 'test-only-maps-key' },
    ]);
  } finally {
    if (previousKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previousKey;
  }
});

test('uses the production API URL when no environment value is provided', () => {
  assert.equal(resolveApiBaseUrl(undefined, true), PRODUCTION_API_BASE_URL);
  assert.equal(resolveApiBaseUrl('  ', true), PRODUCTION_API_BASE_URL);
});

test('normalizes the base path and removes duplicated API segments', () => {
  assert.equal(resolveApiBaseUrl('https://api.example.com/', true), 'https://api.example.com/api');
  assert.equal(resolveApiBaseUrl('https://api.example.com/api/api///', true), 'https://api.example.com/api');
  assert.equal(resolveApiBaseUrl('https://api.example.com/v1/api/', true), 'https://api.example.com/v1/api');
  assert.equal(resolveApiBaseUrl('https://api.example.com//api', true), 'https://api.example.com/api');
});

test('allows local HTTP endpoints during development', () => {
  assert.equal(resolveApiBaseUrl('http://localhost:4000', false), 'http://localhost:4000/api');
  assert.equal(resolveApiBaseUrl('http://192.168.1.20:4000/api/', false), 'http://192.168.1.20:4000/api');
});

test('rejects insecure or local production URLs', () => {
  for (const url of [
    'http://api.example.com/api',
    'https://localhost:4000/api',
    'https://127.0.0.1/api',
    'https://10.0.2.2/api',
    'https://172.16.0.1/api',
    'https://192.168.1.20/api',
    'https://100.64.0.1/api',
  ]) {
    assert.throws(() => resolveApiBaseUrl(url, true), ApiConfigurationError, url);
  }
});

test('rejects malformed URLs and embedded credentials', () => {
  assert.throws(() => resolveApiBaseUrl('not a URL', false), ApiConfigurationError);
  assert.throws(() => resolveApiBaseUrl('https://user:password@api.example.com/api', true), ApiConfigurationError);
});

test('sets the deployed API URL for production APK and store builds', () => {
  assert.equal(easConfig.build.production.env.EXPO_PUBLIC_API_URL, PRODUCTION_API_BASE_URL);
  assert.equal(easConfig.build.production.environment, 'production');
  assert.equal(easConfig.build.production.channel, 'production');
  assert.equal(easConfig.build['production-apk'].extends, 'production');
  assert.equal(easConfig.build['production-apk'].environment, 'production');
  assert.equal(easConfig.build['production-apk'].channel, 'production');
  assert.equal(easConfig.build['production-apk'].android.buildType, 'apk');
  assert.equal(easConfig.build.preview.channel, 'preview');
});
