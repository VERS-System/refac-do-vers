// Contratos compartilhados do perfil e das permissões de usuários do VERS.

export type UserRole = 'USER' | 'ADMIN' | 'TECHNICIAN';

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  status: UserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  displayName?: string | null;
  avatarUrl?: string | null;
}
