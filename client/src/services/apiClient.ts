import { ApiErrorResponse } from '../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  /*
   * If endpoint is already a complete URL, use it directly.
   * Otherwise, prepend the backend API base URL.
   */
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  /*
   * Add JWT access token when available.
   */
  const token = getAccessToken();

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,

    /*
     * Allows cookies such as refreshToken and guestSession
     * to be sent with cross-origin requests.
     */
    credentials: 'include',

    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response: Response;

  try {
    response = await fetch(url, config);
  } catch (_networkError) {
    throw new ApiError(
      "We couldn't connect to AccessAI. Please check your internet connection and try again.",
      0,
      'NETWORK_ERROR'
    );
  }

  /*
   * Successful response
   */
  if (response.ok) {
    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  /*
   * Default error values
   */
  let errorMessage =
    'An unexpected error occurred. Please try again.';

  let errorCode = 'REQUEST_ERROR';

  /*
   * Try to read the backend's error response.
   */
  try {
    const errorData: ApiErrorResponse = await response.json();

    if (errorData?.error?.message) {
      errorMessage = errorData.error.message;
    }

    if (errorData?.error?.code) {
      errorCode = errorData.error.code;
    }
  } catch {
    // Backend response was not JSON.
  }

  /*
   * Handle common HTTP errors.
   */
  if (response.status === 401) {
    errorMessage = 'Invalid email or password.';
  } else if (response.status === 403) {
    errorMessage =
      'You do not have permission to perform this action.';
  } else if (response.status === 404) {
    errorMessage = 'The requested resource was not found.';
  } else if (response.status === 429) {
    errorMessage =
      'Too many attempts. Please try again later.';
  } else if (response.status >= 500) {
    errorMessage =
      "We couldn't connect to AccessAI. Please try again.";
  }

  throw new ApiError(
    errorMessage,
    response.status,
    errorCode
  );
}