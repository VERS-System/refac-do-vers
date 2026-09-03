// Testes unitários do contrato comum de respostas HTTP do backend.

import {
  createApiErrorResponse,
  createApiResponse,
} from './api-response.dto';

describe('Contrato comum de respostas da API', () => {
  it('cria uma resposta de sucesso com dados e identificador da requisição', () => {
    expect(createApiResponse({ id: 'teste-1' }, 'request-1')).toEqual({
      data: { id: 'teste-1' },
      requestId: 'request-1',
    });
  });

  it('inclui metadados somente quando eles são informados', () => {
    expect(
      createApiResponse(['item'], 'request-2', {
        page: 1,
        pageSize: 20,
        total: 1,
      }),
    ).toEqual({
      data: ['item'],
      meta: { page: 1, pageSize: 20, total: 1 },
      requestId: 'request-2',
    });
  });

  it('cria um erro seguro com código estável e timestamp ISO', () => {
    const response = createApiErrorResponse(
      'VALIDATION_ERROR',
      'Não foi possível processar a solicitação.',
      'request-3',
      new Date('2026-09-03T18:30:00.000Z'),
      [{ field: 'email', reason: 'invalid' }],
    );

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Não foi possível processar a solicitação.',
        details: [{ field: 'email', reason: 'invalid' }],
      },
      requestId: 'request-3',
      timestamp: '2026-09-03T18:30:00.000Z',
    });
  });
});
