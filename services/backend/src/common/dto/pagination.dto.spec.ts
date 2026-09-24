// Testes dos DTOs comuns que protegem queries e parametros publicos.

import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PaginationQueryDto,
  UtcDateRangeQueryDto,
  UuidParamDto,
} from './pagination.dto';

describe('DTOs comuns da API', () => {
  it('aplica defaults e transforma paginacao valida', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('rejeita pagina menor que um e pageSize acima do limite', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: '0',
      pageSize: '101',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['page', 'pageSize']),
    );
  });

  it('aceita apenas UUIDs em parametros publicos', async () => {
    const dto = plainToInstance(UuidParamDto, {
      id: '6f7b7f64-7b7f-4a7a-9f67-8e9e5f9f7a11',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejeita datas fora de UTC e intervalo invertido', async () => {
    const dto = plainToInstance(UtcDateRangeQueryDto, {
      startedFrom: '2026-09-24T12:00:00-03:00',
      startedTo: '2026-09-24T11:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['startedFrom', 'startedTo']),
    );
  });
});
