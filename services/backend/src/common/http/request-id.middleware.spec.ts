// Testes do middleware de correlacao por requestId.

import { createRequestIdMiddleware } from './request-id.middleware';
import { RequestWithRequestId } from './request-context';

describe('createRequestIdMiddleware', () => {
  it('reaproveita um x-request-id confiavel e propaga no header de resposta', () => {
    const middleware = createRequestIdMiddleware();
    const request = {
      header: jest.fn().mockReturnValue('client-request-01'),
    } as unknown as RequestWithRequestId;
    const response = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware(request, response as never, next);

    expect(request.requestId).toBe('client-request-01');
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'client-request-01',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('gera um novo identificador quando o header e invalido', () => {
    const middleware = createRequestIdMiddleware();
    const request = {
      header: jest.fn().mockReturnValue('valor com espaco e tamanho inseguro'),
    } as unknown as RequestWithRequestId;
    const response = { setHeader: jest.fn() };

    middleware(request, response as never, jest.fn());

    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
