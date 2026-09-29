// Testes do filtro global que padroniza erros publicos.

import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
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
