// Publica CSRF, cadastro, login e renovação de sessão HTTP do backend VERS.

import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { setSessionCookies } from './auth.cookies';
import { readCookie } from './auth.cookies';
import { csrfToken as createCsrfToken } from './csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService, private readonly auth: AuthService) {}

  /** Gera um token aleatório e o vincula a um cookie host-only. */
  @Get('csrf')
  @HttpCode(200)
  csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response): { csrfToken: string } {
    const nonce = randomBytes(32).toString('hex');
    const accessToken = readCookie(request.header('cookie'), 'vers_access');
    const refreshToken = readCookie(request.header('cookie'), 'vers_refresh');
    if (accessToken === null || refreshToken === null) throw new ForbiddenException();
    const sessionToken = accessToken ?? refreshToken ?? null;
    response.cookie('vers_csrf', nonce, {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60_000,
    });
    return { csrfToken: createCsrfToken(nonce, sessionToken, this.config.getOrThrow<string>('JWT_REFRESH_SECRET')) };
  }

  /** Aceita o cadastro sem sessão e responde igualmente para email existente. */
  @Post('register')
  @HttpCode(202)
  async register(@Body() input: RegisterDto, @Res() response: Response): Promise<void> {
    await this.auth.register(input);
    response.status(202).end();
  }

  /** Inicia sessão apenas para conta ativa e envia JWTs em cookies HttpOnly. */
  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response): Promise<object> {
    const { user, accessToken, refreshToken } = await this.auth.login(input);
    setSessionCookies(
      response, accessToken, refreshToken,
      this.config.getOrThrow<string>('NODE_ENV') === 'production',
      this.config.getOrThrow<string>('auth.accessExpiration'),
      this.config.getOrThrow<string>('auth.refreshExpiration'),
      this.config.getOrThrow<string>('API_PREFIX'),
    );
    return { user };
  }

  /** Renova os cookies após rotação do refresh token, sem retornar credenciais no corpo. */
  @Post('refresh')
  @HttpCode(204)
  async refresh(@Req() request: Request, @Res() response: Response): Promise<void> {
    const token = readCookie(request.header('cookie'), 'vers_refresh');
    if (token === null) throw new UnauthorizedException();
    const { accessToken, refreshToken } = await this.auth.refresh(token);
    setSessionCookies(
      response, accessToken, refreshToken,
      this.config.getOrThrow<string>('NODE_ENV') === 'production',
      this.config.getOrThrow<string>('auth.accessExpiration'),
      this.config.getOrThrow<string>('auth.refreshExpiration'),
      this.config.getOrThrow<string>('API_PREFIX'),
    );
    response.status(204).end();
  }
}
