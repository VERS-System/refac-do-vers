// Define a identidade interna mínima anexada à requisição após validar a sessão.

import { UserRole } from '@prisma/client';

export type AuthPrincipal = {
  id: string;
  sessionId: string;
  roles: UserRole[];
};
