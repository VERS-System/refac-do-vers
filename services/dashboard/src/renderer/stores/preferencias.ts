/**
 * Preferências do usuário no app desktop (tela Configurações).
 *
 * Unidades de exibição, "reduzir movimento" e a tarifa de energia valem no
 * app todo e ficam salvas no aparelho (localStorage), para continuarem depois
 * de fechar o app. Os alertas ficam só em memória (decisão de 14/10/2026),
 * até o backend guardar preferências de notificação.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UnidadePotencia = 'mW' | 'W';
export type UnidadeEnergia = 'mWh' | 'J';
export type UnidadeAceleracao = 'm/s²' | 'g';

/** Unidades de exibição; os dados continuam em mW, mWh e m/s². */
export interface Unidades {
  potencia: UnidadePotencia;
  energia: UnidadeEnergia;
  aceleracao: UnidadeAceleracao;
}

/** Alerta de telemetria ou notificação, com o limite descrito em texto. */
export interface Alerta {
  id: string;
  titulo: string;
  descricao: string;
  limite: string;
  ativo: boolean;
}

export interface Preferencias {
  unidades: Unidades;
  reduzirMovimento: boolean;
  /** Tarifa de energia em reais por kWh; `null` enquanto não cadastrada. */
  tarifaPorKwh: number | null;
  alertas: Alerta[];
}

interface EstadoPreferencias extends Preferencias {
  /** Grava as preferências informadas, mantendo as demais. */
  salvar: (preferencias: Partial<Preferencias>) => void;
}

/** Chave do armazenamento local. */
export const CHAVE_ARMAZENAMENTO = 'vers-preferencias';

/** Preferências de fábrica: as unidades do laboratório e os alertas da referência. */
export const PREFERENCIAS_PADRAO: Preferencias = {
  unidades: { potencia: 'mW', energia: 'mWh', aceleracao: 'm/s²' },
  reduzirMovimento: false,
  tarifaPorKwh: null,
  alertas: [
    {
      id: 'offline',
      titulo: 'Dispositivo offline por mais de 5 min',
      descricao: 'Aviso crítico de interrupção das mensagens MQTT.',
      limite: '> 5 min',
      ativo: true,
    },
    {
      id: 'eficiencia',
      titulo: 'Eficiência abaixo de 30%',
      descricao: 'Queda de rendimento na cadeia de conversão.',
      limite: '< 30%',
      ativo: true,
    },
    {
      id: 'temperatura',
      titulo: 'Temperatura acima de 60 °C',
      descricao: 'Alerta térmico no bloco de transdutores piezoelétricos.',
      limite: '> 60 °C',
      ativo: true,
    },
    {
      id: 'resumo-diario',
      titulo: 'Resumo diário por e-mail',
      descricao: 'Relatório consolidado da energia recuperada no dia.',
      limite: '23:59',
      ativo: false,
    },
  ],
};

/**
 * Store das preferências, persistido no localStorage.
 *
 * O `partialize` grava só unidades, movimento e tarifa: os alertas voltam ao
 * padrão a cada abertura do app.
 */
export const usePreferencias = create<EstadoPreferencias>()(
  persist(
    (set) => ({
      ...structuredClone(PREFERENCIAS_PADRAO),
      salvar: (preferencias) => set(preferencias),
    }),
    {
      name: CHAVE_ARMAZENAMENTO,
      partialize: ({ unidades, reduzirMovimento, tarifaPorKwh }) => ({
        unidades,
        reduzirMovimento,
        tarifaPorKwh,
      }),
    },
  ),
);
