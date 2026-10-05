// Testes do filtro global que padroniza erros publicos.

import { ArgumentsHost, BadRequestException, ForbiddenException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('mapeia recusa 403 para o código público de autorização', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = { switchToHttp: () => ({ getRequest: (): { requestId: string } => ({ requestId: 'request-forbidden' }), getResponse: (): { status: jest.Mock } => ({ status }) }) } as unknown as ArgumentsHost;
    new HttpExceptionFilter().catch(new ForbiddenException(), host);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'AUTH_UNAUTHORIZED' }) }));
  });
  it('converte erros de validacao para o envelope publico sem stack trace', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: (): {
        getRequest: () => { requestId: string };
        getResponse: () => { status: jest.Mock };
      } => ({
        getRequest: (): { requestId: string } => ({
          requestId: 'request-validation',
        }),
        getResponse: (): { status: jest.Mock } => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(
      new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: [{ message: 'email must be an email' }],
        }),
        requestId: 'request-validation',
      }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('stack');
  });
});
