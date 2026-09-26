// Testes de compilação dos contratos de autenticação e perfil do VERS.

import type {
  ApiSuccessResponse,
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterRequest,
  UpdateUserProfileRequest,
  UserProfile,
  UserRole,
} from '../src/index';
import { authResponseFixture, userProfileFixture } from '../src/index';

const registerRequest: RegisterRequest = {
  email: 'ana@example.com',
  password: 'Senha@123',
  displayName: 'Ana Silva',
};

const loginRequest: LoginRequest = {
  email: registerRequest.email,
  password: registerRequest.password,
};

const refreshRequest: RefreshTokenRequest = {};

const logoutRequest: LogoutRequest = refreshRequest;

const profileUpdate: UpdateUserProfileRequest = {
  displayName: 'Ana Souza',
  avatarUrl: null,
};

const profileResponse: ApiSuccessResponse<UserProfile> = {
  data: userProfileFixture,
  requestId: 'request-profile-001',
};

const authResponse: ApiSuccessResponse<AuthResponse> = {
  data: authResponseFixture,
  requestId: 'request-auth-001',
};

void loginRequest;
void logoutRequest;
void profileUpdate;
void profileResponse;
void authResponse;

const adminRoles: UserRole[] = ['USER', 'ADMIN'];
void adminRoles;
// @ts-expect-error A função TECHNICIAN não integra os papéis iniciais.
const unsupportedRole: UserRole = 'TECHNICIAN';
void unsupportedRole;

// @ts-expect-error A senha nunca pertence ao perfil retornado pela API.
const invalidProfile: UserProfile = { ...userProfileFixture, password: 'segredo' };
void invalidProfile;

// @ts-expect-error Tokens nunca são expostos no corpo acessível ao JavaScript.
authResponseFixture.tokens;

const invalidRefreshRequest: RefreshTokenRequest = {
  // @ts-expect-error O refresh token vem exclusivamente do cookie HttpOnly.
  refreshToken: 'refresh-token-exposto',
};
void invalidRefreshRequest;
