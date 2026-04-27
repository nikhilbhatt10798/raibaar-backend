/**
 * URL Helper utility functions for dynamic URL generation
 */

/**
 * Get the base URL for the API server
 * @returns Base URL with protocol and host
 */
export const getBaseUrl = (): string => {
  return process.env.BASE_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
};

/**
 * Get the upload URL for a specific filename
 * @param filename - The filename to generate URL for
 * @returns Full URL to access the uploaded file
 */
export const getFileUrl = (filename: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/uploads/${filename}`;
};

/**
 * Get frontend URL for client-side redirects or CORS
 * @returns Frontend URL from environment or localhost fallback
 */
export const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || "http://localhost:3000";
};

/**
 * Get development URL for local development
 * @returns Development URL from environment or localhost:5173 fallback
 */
export const getDevUrl = (): string => {
  return process.env.DEV_URL || "http://localhost:5173";
};

/**
 * Get allowed CORS origins array
 * @returns Array of allowed origins for CORS configuration
 */
export const getCorsOrigins = (): string[] => {
  const origins = [
    getFrontendUrl(),
    getDevUrl()
  ];
  
  if (process.env.CORS_ORIGIN) {
    origins.push(process.env.CORS_ORIGIN);
  }
  
  return origins;
};
