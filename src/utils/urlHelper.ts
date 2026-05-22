/**
 * URL Helper utility functions for dynamic URL generation.
 */

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const stripApiSuffix = (value: string): string => value.replace(/\/api\/?$/, "");

/**
 * Get the public base URL for this API server.
 * In production set PUBLIC_BASE_URL or BACKEND_URL, for example:
 * https://api.raibaarstay.com
 */
export const getBaseUrl = (): string => {
  const configured =
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.API_URL;

  if (configured) {
    return stripApiSuffix(trimTrailingSlash(configured));
  }

  return `http://localhost:${process.env.PORT || 5000}`;
};

/**
 * Build a public URL for an uploaded file path.
 */
export const getFileUrl = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutUploadsPrefix = normalizedPath.replace(/^uploads\//, "");
  return `${getBaseUrl()}/uploads/${withoutUploadsPrefix}`;
};

/**
 * Convert stored media values into environment-safe public URLs.
 * Preserves third-party URLs and rewrites localhost/manual upload URLs.
 */
export const normalizeMediaUrl = (value?: string | null): string => {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const uploadsMatch = trimmed.match(/(?:https?:\/\/[^/]+)?\/?uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return getFileUrl(uploadsMatch[1]);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return getFileUrl(trimmed);
};

export const normalizeMediaUrls = (values?: string[]): string[] =>
  (values || []).map(normalizeMediaUrl).filter(Boolean);

/**
 * Get frontend URL for client-side redirects or CORS.
 */
export const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || "http://localhost:3000";
};

/**
 * Get development URL for local development.
 */
export const getDevUrl = (): string => {
  return process.env.DEV_URL || "http://localhost:5173";
};

/**
 * Get allowed CORS origins array.
 */
export const getCorsOrigins = (): string[] => {
  const configuredOrigins = [
    process.env.CORS_ORIGIN,
    process.env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((origin) => String(origin).split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([getFrontendUrl(), getDevUrl(), ...configuredOrigins]));
};
