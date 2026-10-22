export const PRODUCTION_API_BASE_URL = 'https://civicfix-api-22p5.onrender.com/api';

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export function resolveApiBaseUrl(configuredUrl: string | undefined, isProduction: boolean): string {
  const value = configuredUrl?.trim() || PRODUCTION_API_BASE_URL;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ApiConfigurationError('EXPO_PUBLIC_API_URL must be a valid URL.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ApiConfigurationError('EXPO_PUBLIC_API_URL must be an HTTP(S) base URL without credentials or query parameters.');
  }

  if (isProduction && (url.protocol !== 'https:' || isLocalHostname(hostname))) {
    throw new ApiConfigurationError('Production EXPO_PUBLIC_API_URL must use HTTPS and a public host.');
  }

  const path = url.pathname.replace(/\/+/g, '/').replace(/\/+$/, '').replace(/(?:\/api)+$/i, '');
  return `${url.origin}${path}/api`;
}

function isLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
  if (normalizedHostname === 'localhost' || normalizedHostname.endsWith('.localhost') || normalizedHostname.endsWith('.local') || normalizedHostname.endsWith('.lan') || normalizedHostname.endsWith('.internal')) {
    return true;
  }

  const octets = normalizedHostname.split('.').map(Number);
  if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)) {
    const [first, second] = octets;
    return first === 0
      || first === 10
      || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }

  return normalizedHostname === '::'
    || normalizedHostname === '::1'
    || /^f[cd]/i.test(normalizedHostname)
    || /^fe[89ab]/i.test(normalizedHostname)
    || /^::ffff:/i.test(normalizedHostname);
}
