import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CIVIC_PIN_MOTION } from '../src/splash/pinMotion.ts';

test('Civic pin motion uses numeric interpolation ranges and values', () => {
  assert.deepEqual(CIVIC_PIN_MOTION.inputRange, [0.34, 0.42, 0.5]);
  assert.deepEqual(CIVIC_PIN_MOTION.translateY, [48, 0, 8]);
  assert.deepEqual(CIVIC_PIN_MOTION.scale, [0.7, 1.08, 1]);

  for (const values of Object.values(CIVIC_PIN_MOTION)) {
    assert.equal(values.length, CIVIC_PIN_MOTION.inputRange.length);
    assert.ok(values.every((value) => typeof value === 'number' && Number.isFinite(value)));
  }
});

test('animated pin transform is not passed through an SVG Group', () => {
  const source = readFileSync(new URL('../src/splash/CinematicSplash.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /<AnimatedG\b[^>]*\btransform\s*=/s);
  assert.match(source, /<Animated\.View\b/);
});
