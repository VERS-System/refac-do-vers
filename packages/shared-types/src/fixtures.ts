// Fixtures sintéticas e tipadas para integração dos clientes com a API VERS.

import type { AuthResponse } from './auth';
import type { PaginatedResponse } from './api';
import type { Configuration, Installation } from './installations';
import type { UserProfile } from './users';
import type { Vehicle } from './vehicles';

export const userProfileFixture = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@example.com',
  displayName: 'Ana Silva',
  avatarUrl: null,
  roles: ['USER'],
  status: 'ACTIVE',
  emailVerifiedAt: '2026-09-20T12:00:00.000Z',
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies UserProfile;

export const authResponseFixture = {
  user: userProfileFixture,
} satisfies AuthResponse;

export const vehicleFixture = {
  id: '00000000-0000-4000-8000-000000000101',
  licensePlate: 'ABC1D23',
  brand: 'Marca Exemplo',
  model: 'Modelo Exemplo',
  modelYear: 2026,
  relationship: 'OWNER',
  isPrimary: true,
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies Vehicle;

export const vehicleListFixture = {
  data: [vehicleFixture],
  meta: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
  requestId: 'request-vehicles-001',
} satisfies PaginatedResponse<Vehicle>;

export const installationFixture = {
  id: '00000000-0000-4000-8000-000000000201',
  vehicleId: vehicleFixture.id,
  systemModel: 'VERS Protótipo A',
  status: 'ACTIVE',
  installedAt: '2026-09-20T12:00:00.000Z',
  activeDevice: {
    id: '00000000-0000-4000-8000-000000000202',
    name: 'ESP32 de demonstração',
    firmwareVersion: '0.1.0',
    status: 'ONLINE',
    lastSeenAt: '2026-09-22T12:00:00.000Z',
  },
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
} satisfies Installation;

export const installationListFixture = {
  data: [installationFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-installations-001',
} satisfies PaginatedResponse<Installation>;

export const configurationFixture = {
  id: '00000000-0000-4000-8000-000000000203',
  installationId: installationFixture.id,
  name: 'Montagem inicial',
  version: 1,
  activePiezoCount: 8,
  piezoAssociation: 'PARALLEL',
  installationPoint: 'Suporte de testes',
  storageType: 'CAPACITOR',
  notes: null,
  createdAt: '2026-09-20T12:00:00.000Z',
} satisfies Configuration;

export const configurationListFixture = {
  data: [configurationFixture],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  requestId: 'request-configurations-001',
} satisfies PaginatedResponse<Configuration>;
