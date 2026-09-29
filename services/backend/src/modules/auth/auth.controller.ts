// Publica a preparação CSRF necessária às futuras mutações de autenticação.

import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService, private readonly auth: AuthService) {}

  /** Gera um token aleatório e o vincula a um cookie host-only. */
  @Get('csrf')
  @HttpCode(200)
  csrf(@Res({ passthrough: true }) response: Response): { csrfToken: string } {
    const csrfToken = randomBytes(32).toString('hex');
    response.cookie('vers_csrf', csrfToken, {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60_000,
    });
    return { csrfToken };
  }

  /** Aceita o cadastro sem sessão e responde igualmente para email existente. */
  @Post('register')
  @HttpCode(202)
  async register(@Body() input: RegisterDto, @Res() response: Response): Promise<void> {
    await this.auth.register(input);
    response.status(202).end();
  }
}
