// Declara os papéis globais aceitos em uma rota protegida do backend.

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const REQUIRED_ROLES = 'vers:roles';

/** Define os papéis alternativos aceitos; a rota sobrescreve o controlador. */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> => SetMetadata(REQUIRED_ROLES, roles);
