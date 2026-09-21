// Fixtures sintéticas e tipadas para integração dos clientes com a API VERS.

import type { AuthResponse } from './auth';
import type { UserProfile } from './users';

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
