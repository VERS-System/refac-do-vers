// Consulta e atualiza a conta autenticada sem expor hashes ou estruturas internas.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfile } from '../../../../../packages/shared-types/src/users';
import { UpdateProfileDto } from './update-profile.dto';

const profileSelect = { id: true, email: true, displayName: true, avatarUrl: true,
  status: true, roles: { select: { role: true } }, emailVerifiedAt: true,
  createdAt: true, updatedAt: true } satisfies Prisma.UserSelect;
type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

/** Projeta os campos públicos e serializa instantes para o contrato UTC. */
function publicProfile(user: ProfileRow): UserProfile {
  return { id: user.id, email: user.email, displayName: user.displayName,
    avatarUrl: user.avatarUrl, status: user.status, roles: user.roles.map(({ role }) => role),
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() };
}

@Injectable()
export class UsersService {
  /** Injeta a persistência existente para limitar todas as operações à própria conta. */
  constructor(private readonly prisma: PrismaService) {}

  /** Busca somente campos públicos da conta indicada pelo guard autenticado. */
  async me(id: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: profileSelect });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    return publicProfile(user);
  }

  /** Atualiza apenas campos enviados numa escrita única; traduz ausência sem ocultar falhas. */
  async update(id: string, input: UpdateProfileDto): Promise<UserProfile> {
    const data = { ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}) };
    if (!Object.keys(data).length) throw new BadRequestException();
    try {
      return publicProfile(await this.prisma.user.update({ where: { id }, data, select: profileSelect }));
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2025') throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      throw error;
    }
  }
}
