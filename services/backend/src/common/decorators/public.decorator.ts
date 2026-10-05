// Permite exceções públicas explícitas em controladores com guards opt-in.

import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'vers:public';

/** Marca a rota como pública para dispensar os guards de sessão e papel. */
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(PUBLIC_ROUTE, true);
