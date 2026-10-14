/**
 * Estado de exemplo do sistema: leitura ao vivo, bateria, vibração e cadastro.
 *
 * Valores das referências do Stitch (Visão geral, Energia, Veículo e
 * instalação), coerentes com o "agora" do exemplo (05/10/2026 18:05). Onde as
 * referências divergiam entre si, a escolha está indicada no comentário.
 */

import type { Bateria, Dispositivo, PontoConversao, Usuario, Veiculo, Vibracao } from '../tipos';

/**
 * Leitura instantânea dos 4 pontos da cadeia de conversão.
 *
 * V, I e P são medidos pelo ESP32; P bate com V × I dentro de 1 mW.
 */
export const CADEIA_AO_VIVO: Omit<PontoConversao, 'eficienciaEstagioPercentual'>[] = [
  { ponto: 1, nome: 'Nó comum', descricao: 'Sensor piezoelétrico', tensaoV: 4.82, correnteMa: 44, potenciaMw: 212 },
  { ponto: 2, nome: 'Saída LTC3588', descricao: 'Retificação e step-down', tensaoV: 3.3, correnteMa: 56, potenciaMw: 185 },
  { ponto: 3, nome: 'Bateria TP4056', descricao: 'Gerenciamento Li-ion', tensaoV: 3.91, correnteMa: 42, potenciaMw: 164 },
  { ponto: 4, nome: 'Celular', descricao: 'Carga de uso final', tensaoV: 5.02, correnteMa: 23, potenciaMw: 115 },
];

/**
 * Bateria do sistema.
 *
 * A Energia mostra "Li-ion 3,7 V · 2200 mAh" e o Veículo "Li-Po 1200 mAh";
 * vale a da Energia, que é a tela dedicada à bateria.
 */
export const BATERIA_EXEMPLO: Bateria = {
  quimica: 'Li-ion',
  tensaoNominalV: 3.7,
  capacidadeMah: 2200,
  estado: 'carregando',
  cargaPercentual: 68,
  tensaoV: 3.92,
  ciclos: 3,
  temperaturaC: 31.4,
};

/** Vibração medida no eixo vertical, com 6 dos 8 piezos captando. */
export const VIBRACAO_EXEMPLO: Vibracao = {
  rmsMs2: 3.2,
  eixo: 'Z (vertical)',
  faixa: 'normal',
  piezosAtivos: 6,
  piezosTotal: 8,
  frequenciaDominanteHz: 42.8,
  temperaturaBlocoC: 31.4,
};

/**
 * Capacidade de referência de um celular, em mWh (4.000 mAh × 3,85 V).
 *
 * Base do "≈ 7% de uma recarga" da tela Energia (1,03 Wh ÷ 15,4 Wh).
 */
export const CAPACIDADE_CELULAR_MWH = 15400;

export const VEICULO_EXEMPLO: Veiculo = {
  id: 'veiculo-civic',
  fabricante: 'Honda',
  modelo: 'Civic',
  ano: 2026,
  placa: 'ABC1D23',
};

/** ESP32 com a última mensagem 3 s antes do "agora" do exemplo. */
export const DISPOSITIVO_EXEMPLO: Dispositivo = {
  id: 'VERS-01',
  plataforma: 'ESP32',
  firmware: '0.4.2',
  online: true,
  ultimoContato: '2026-10-05T18:04:57-03:00',
  protocolo: 'MQTT',
};

export const USUARIO_EXEMPLO: Usuario = {
  id: 'USR-88192-BR',
  nome: 'Ana Silva',
  funcao: 'Administradora',
};
