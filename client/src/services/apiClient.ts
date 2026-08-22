import { ApiErrorResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Ensures cookies (guestSession, refreshToken) are included
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

  if (response.ok) {
    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  // Handle specific status codes
  let errorMessage = 'An unexpected error occurred. Please try again.';
  let errorCode = 'REQUEST_ERROR';

  try {
    const errorData: ApiErrorResponse = await response.json();
    if (errorData?.error?.message) {
      errorMessage = errorData.error.message;
    }
    if (errorData?.error?.code) {
      errorCode = errorData.error.code;
    }
  } catch {
    // Fallback if response is not JSON
  }

  if (response.status === 401) {
    errorMessage = 'Invalid email or password.';
  } else if (response.status === 429) {
    errorMessage = 'Too many attempts. Please try again later.';
  } else if (response.status >= 500) {
    errorMessage = "We couldn't connect to AccessAI. Please try again.";
  }

  throw new ApiError(errorMessage, response.status, errorCode);
}
