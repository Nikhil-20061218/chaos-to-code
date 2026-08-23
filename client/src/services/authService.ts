let refreshPromise: Promise<{ accessToken: string }> | null = null;
import { apiClient, setAccessToken, getAccessToken } from './apiClient';
import { LoginCredentials, LoginResponse, GuestSessionResponse, User } from '../types/auth';

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export interface VerifyEmailCredentials {
  email: string;
  otp: string;
}

let currentUser: User | null = null;

export const authService = {
  /**
   * Login user with email and password
   * POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const data = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });

    if (data.accessToken) {
      setAccessToken(data.accessToken);
      currentUser = data.user;
    }

    return data;
  },

  /**
   * Register new user account
   * POST /api/auth/register
   */
  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    return apiClient<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: credentials.name.trim(),
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });
  },

  /**
   * Confirm the verification code sent after registration.
   * POST /api/auth/verify-email
   */
  async verifyEmail(credentials: VerifyEmailCredentials): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        otp: credentials.otp.trim(),
      }),
    });
  },

  /**
   * Request a replacement verification code.
   * POST /api/auth/resend-otp
   */
  async resendOtp(email: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  /**
   * Refresh the access token using the HTTP-only refresh cookie
   * POST /api/auth/refresh
   */
  async refresh(): Promise<{ accessToken: string }> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = apiClient<{ accessToken: string }>('/auth/refresh', {
    method: 'POST',
  })
    .then((data) => {
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }

      return data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
},

  /**
   * Get the current user details
   * GET /api/auth/me
   */
  async me(): Promise<{ user: User }> {
    const data = await apiClient<{ user: User }>('/auth/me', {
      method: 'GET',
    });
    if (data.user) {
      currentUser = data.user;
    }
    return data;
  },

  /**
   * Logout current session
   * POST /api/auth/logout
   */
  async logout(): Promise<{ message: string }> {
    try {
      const data = await apiClient<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      return data;
    } catch {
      // Even if network fails, ensure local auth is cleared
      return { message: 'Logged out locally' };
    } finally {
      setAccessToken(null);
      currentUser = null;
    }
  },

  /**
   * Create a guest session
   * POST /api/guest/session
   */
  async createGuestSession(): Promise<GuestSessionResponse> {
    return apiClient<GuestSessionResponse>('/guest/session', {
      method: 'POST',
    });
  },

  /**
   * Get the current in-memory access token
   */
  getAccessToken(): string | null {
    return getAccessToken();
  },

  /**
   * Get the current cached user
   */
  getCurrentUser(): User | null {
    return currentUser;
  },

  /**
   * Set user profile in state
   */
  setCurrentUser(user: User | null): void {
    currentUser = user;
  },

  /**
   * Clear in-memory token state
   */
  clearAuth(): void {
    setAccessToken(null);
    currentUser = null;
  },
};
