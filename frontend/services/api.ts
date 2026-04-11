const DEV_API_BASE_URL = 'http://127.0.0.1:8000';

function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return DEV_API_BASE_URL;
  }

  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();