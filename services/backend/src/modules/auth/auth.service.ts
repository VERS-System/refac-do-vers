// Cria contas locais pendentes sem expor a existência prévia de um email.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persiste hash e papel padrão numa operação atômica; duplicidade é indistinguível. */
  async register(input: RegisterDto): Promise<void> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      await this.prisma.user.create({
        data: {
          email: input.email.trim().toLowerCase(),
          passwordHash,
          displayName: input.displayName,
          status: 'PENDING_VERIFICATION',
          roles: { create: { role: 'USER' } },
        },
      });
    } catch (error) {
      const conflict = error as { code?: string; meta?: { target?: string[] } };
      if (conflict.code === 'P2002' && conflict.meta?.target?.includes('email')) return;
      throw error;
    }
  }
}
