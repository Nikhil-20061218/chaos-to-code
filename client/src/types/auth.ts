export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface GuestSessionResponse {
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
