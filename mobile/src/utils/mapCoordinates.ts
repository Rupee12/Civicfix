export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export function normalizeMapCoordinate(value: unknown): MapCoordinate | null {
  if (!value || typeof value !== 'object') return null;

  const coordinate = value as Record<string, unknown>;
  const { latitude, longitude } = coordinate;
  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}
