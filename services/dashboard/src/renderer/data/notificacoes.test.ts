/**
 * Testes das notificações do sino (Fase 5, lote 10): alertas ativos das
 * Configurações conferidos contra os dados e eventos tirados dos próprios
 * dados (testes encerrados ou em andamento, dispositivo online).
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { describe, expect, it } from 'vitest';
import { PREFERENCIAS_PADRAO, type Alerta } from '@/stores/preferencias';
import { montarNotificacoes, type DadosNotificacoes } from './notificacoes';
import type { Dispositivo, TesteCampo } from './tipos';

const AGORA = new Date('2026-10-04T18:05:03-03:00');

const DISPOSITIVO: Dispositivo = {
  id: 'VERS-01',
  plataforma: 'ESP32',
  firmware: '0.4.2',
  online: true,
  ultimoContato: '2026-10-04T18:05:00-03:00',
  protocolo: 'MQTT',
};

/** Teste mínimo com o estado e as datas dadas. */
function teste(
  codigo: string,
  estado: TesteCampo['estado'],
  inicio: string | null,
  fim: string | null,
): TesteCampo {
  return {
    id: `t-${codigo}`,
    codigo: `#${codigo}`,
    nome: `Trajeto ${codigo}`,
    estado,
    inicio,
    fim,
  } as TesteCampo;
}

/** Dados de exemplo como os do app: nada passa dos limites. */
function dados(extra: Partial<DadosNotificacoes> = {}): DadosNotificacoes {
  return {
    alertas: PREFERENCIAS_PADRAO.alertas,
    agora: AGORA,
    dispositivo: DISPOSITIVO,
    eficienciaHojePercentual: 53.5,
    temperaturaBlocoC: 31.4,
    testes: [
      teste('024', 'em-andamento', '2026-10-04T17:30:00-03:00', null),
      teste('023', 'concluido', '2026-10-03T17:30:00-03:00', '2026-10-03T18:10:00-03:00'),
      teste('022', 'falhou', '2026-10-02T08:00:00-03:00', '2026-10-02T08:20:00-03:00'),
      teste('021', 'planejado', null, null),
    ],
    ...extra,
  };
}

describe('montarNotificacoes', () => {
  /** Com os dados de exemplo, nenhum alerta dispara; os eventos vêm do mais recente. */
  it('lista os eventos sem alertas disparados', () => {
    const { disparados, eventos } = montarNotificacoes(dados());

    expect(disparados).toEqual([]);
    expect(eventos.map((e) => e.titulo)).toEqual([
      'ESP32 · VERS-01 online',
      'Teste #024 em andamento',
      'Teste #023 concluído',
      'Teste #022 falhou',
    ]);
  });

  /** Cada alerta ativo dispara quando o dado passa do limite. */
  it('dispara os alertas ativos', () => {
    const { disparados } = montarNotificacoes(
      dados({
        dispositivo: { ...DISPOSITIVO, online: false, ultimoContato: '2026-10-04T17:55:00-03:00' },
        eficienciaHojePercentual: 24.2,
        temperaturaBlocoC: 63,
      }),
    );

    expect(disparados.map((n) => [n.id, n.tom])).toEqual([
      ['alerta-offline', 'danger'],
      ['alerta-eficiencia', 'warning'],
      ['alerta-temperatura', 'danger'],
    ]);
    expect(disparados[0].detalhe).toBe('ESP32 · VERS-01 sem mensagens há 10 min.');
    expect(disparados[1].detalhe).toBe('Eficiência ponta a ponta de hoje em 24,2%.');
    expect(disparados[2].detalhe).toBe('Bloco dos piezos a 63,0 °C.');
  });

  /** Alerta desligado nas Configurações não dispara. */
  it('ignora alertas desligados', () => {
    const alertas: Alerta[] = PREFERENCIAS_PADRAO.alertas.map((a) => ({ ...a, ativo: false }));

    const { disparados } = montarNotificacoes(dados({ alertas, temperaturaBlocoC: 80 }));

    expect(disparados).toEqual([]);
  });

  /** Sem dados ainda (carregando), não há o que avisar. */
  it('funciona sem dados', () => {
    expect(montarNotificacoes({ alertas: PREFERENCIAS_PADRAO.alertas, agora: AGORA })).toEqual({
      disparados: [],
      eventos: [],
    });
  });
});
