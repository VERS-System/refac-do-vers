// Testes de compilação dos contratos públicos compartilhados da API VERS.

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthResponse,
  CreateVehicleRequest,
  LoginRequest,
  PaginatedResponse,
  RefreshTokenRequest,
  RegisterRequest,
  UpdateUserProfileRequest,
  UpdateVehicleRequest,
  UserProfile,
  Vehicle,
} from '../src/index';
import {
  authResponseFixture,
  userProfileFixture,
  vehicleFixture,
  vehicleListFixture,
} from '../src/index';

const registerRequest: RegisterRequest = {
  email: 'ana@example.com',
  password: 'Senha@123',
  displayName: 'Ana Silva',
};

const loginRequest: LoginRequest = {
  email: registerRequest.email,
  password: registerRequest.password,
};

const refreshRequest: RefreshTokenRequest = {
  refreshToken: 'refresh-token-sintetico',
};

const profileUpdate: UpdateUserProfileRequest = {
  displayName: 'Ana Souza',
  avatarUrl: null,
};

const vehicleCreate: CreateVehicleRequest = {
  licensePlate: 'ABC1D23',
  brand: 'Marca Exemplo',
  model: 'Modelo Exemplo',
  modelYear: 2026,
};

const vehicleUpdate: UpdateVehicleRequest = {
  modelYear: 2027,
  isPrimary: true,
};

const profileResponse: ApiSuccessResponse<UserProfile> = {
  data: userProfileFixture,
  requestId: 'request-profile-001',
};

const authResponse: ApiSuccessResponse<AuthResponse> = {
  data: authResponseFixture,
  requestId: 'request-auth-001',
};

const vehicleResponse: ApiSuccessResponse<Vehicle> = {
  data: vehicleFixture,
  requestId: 'request-vehicle-001',
};

const vehiclesResponse: PaginatedResponse<Vehicle> = vehicleListFixture;

const errorResponse: ApiErrorResponse = {
  error: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Não foi possível autenticar com as credenciais informadas.',
    details: [],
  },
  requestId: 'request-error-001',
  timestamp: '2026-09-21T12:00:00.000Z',
};

void loginRequest;
void refreshRequest;
void profileUpdate;
void vehicleCreate;
void vehicleUpdate;
void profileResponse;
void authResponse;
void vehicleResponse;
void vehiclesResponse;
void errorResponse;

// @ts-expect-error A senha nunca pertence ao perfil retornado pela API.
const invalidProfile: UserProfile = { ...userProfileFixture, password: 'segredo' };
void invalidProfile;

// @ts-expect-error A placa normalizada é obrigatória no cadastro do veículo.
const invalidVehicle: CreateVehicleRequest = { brand: 'Marca Exemplo' };
void invalidVehicle;
