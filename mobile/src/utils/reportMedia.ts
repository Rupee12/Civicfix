export const MAX_REPORT_PHOTOS = 5;
export const MAX_REPORT_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_REPORT_IMAGE_DIMENSION = 1600;
export const MAX_REPORT_SOURCE_PIXELS = 40_000_000;

export function isValidReportPhotoUri(uri: string): boolean {
  return /^(file|content):\/\//i.test(uri);
}

export function isReportImageAsset(asset: {
  type?: string | null;
  mimeType?: string | null;
}): boolean {
  if (asset.type && asset.type !== 'image') return false;
  if (asset.mimeType && !asset.mimeType.toLowerCase().startsWith('image/')) return false;
  return asset.type === 'image' || Boolean(asset.mimeType?.toLowerCase().startsWith('image/'));
}

export function getReportImageResizeAction(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  if (Math.max(width, height) <= MAX_REPORT_IMAGE_DIMENSION) return [];
  return width >= height
    ? [{ resize: { width: MAX_REPORT_IMAGE_DIMENSION } }]
    : [{ resize: { height: MAX_REPORT_IMAGE_DIMENSION } }];
}

export function isValidReportPhotoSize(size: number): boolean {
  return Number.isFinite(size) && size > 0 && size <= MAX_REPORT_PHOTO_BYTES;
}

export function getSelectedReportAssets<T>(result: {
  canceled: boolean;
  assets: T[] | null;
}): T[] {
  return result.canceled ? [] : result.assets ?? [];
}
