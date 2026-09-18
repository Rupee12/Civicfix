export const duplicateDetectionConfig = {
  radiusMeters: 500,
  maxCandidates: 5,
  weights: { geo: 0.4, category: 0.25, text: 0.35 },
  thresholds: { high: 0.8, possible: 0.5 },
  includeClosed: false,
};