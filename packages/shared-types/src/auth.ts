// Contratos compartilhados dos fluxos de autenticação da API VERS.

import type { UserProfile } from './users';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type RefreshTokenRequest = Record<string, never>;

export type LogoutRequest = Record<string, never>;

export type LogoutAllRequest = Record<string, never>;

export interface CsrfResponse {
  csrfToken: string;
}

export interface AuthResponse {
  user: UserProfile;
}
