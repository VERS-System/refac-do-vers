/**
 * Estado de exemplo do sistema: leitura ao vivo, bateria, vibração e cadastro.
 *
 * Valores das referências do Stitch (Visão geral, Energia, Veículo e
 * instalação), coerentes com o "agora" do exemplo (05/10/2026 18:05). Onde as
 * referências divergiam entre si, a escolha está indicada no comentário.
 */

import type {
  Bateria,
  Configuracao,
  Dispositivo,
  Instalacao,
  LinhaLog,
  PontoConversao,
  Revisao,
  Usuario,
  Veiculo,
  Vibracao,
} from '../tipos';

/**
 * Leitura instantânea dos 4 pontos da cadeia de conversão.
 *
 * V, I e P são medidos pelo ESP32; P bate com V × I dentro de 1 mW.
 */
export const CADEIA_AO_VIVO: Omit<PontoConversao, 'eficienciaEstagioPercentual'>[] = [
  {
    ponto: 1,
    nome: 'Nó comum',
    descricao: 'Sensor piezoelétrico',
    tensaoV: 4.82,
    correnteMa: 44,
    potenciaMw: 212,
  },
  {
    ponto: 2,
    nome: 'Saída LTC3588',
    descricao: 'Retificação e step-down',
    tensaoV: 3.3,
    correnteMa: 56,
    potenciaMw: 185,
  },
  {
    ponto: 3,
    nome: 'Bateria TP4056',
    descricao: 'Gerenciamento Li-ion',
    tensaoV: 3.91,
    correnteMa: 42,
    potenciaMw: 164,
  },
  {
    ponto: 4,
    nome: 'Celular',
    descricao: 'Carga de uso final',
    tensaoV: 5.02,
    correnteMa: 23,
    potenciaMw: 115,
  },
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

/** IDs dos veículos de exemplo, no formato UUID que o backend gera. */
export const ID_CIVIC = '3f2b8c1e-6d4a-4b7e-9c21-5a8f0e6d7b14';
export const ID_STRADA = '8a1d5e90-2c47-4f3b-b6e8-1d9c7a4e2f63';

/**
 * Veículos da usuária: o Civic (principal, com a instalação) e a Strada,
 * que ela dirige e ainda não tem instalação.
 */
export const VEICULOS_EXEMPLO: Veiculo[] = [
  {
    id: ID_CIVIC,
    placa: 'ABC1D23',
    fabricante: 'Honda',
    modelo: 'Civic',
    ano: 2026,
    chassi: null,
    relacao: 'proprietario',
    principal: true,
    criadoEm: '2026-09-10T14:20:00-03:00',
  },
  {
    id: ID_STRADA,
    placa: 'DEF4G56',
    fabricante: 'Fiat',
    modelo: 'Strada',
    ano: 2024,
    chassi: null,
    relacao: 'motorista',
    principal: false,
    criadoEm: '2026-09-18T09:05:00-03:00',
  },
];

/** Instalação do VERS no Civic, ativa desde 12/09/2026, com o ESP32 VERS-01. */
export const INSTALACAO_EXEMPLO: Omit<Instalacao, 'dispositivo'> = {
  id: 'instalacao-pz01',
  veiculoId: ID_CIVIC,
  modelo: 'VERS-PZ01',
  status: 'ativa',
  instaladaEm: '2026-09-12',
};

/** Ponto de instalação dos piezos (o mesmo nas três versões). */
const PONTO_INSTALACAO =
  'Suspensão dianteira e traseira (acoplamento em amortecedores helicoidais MacPherson e Multi-link).';

/**
 * Versões da configuração, da mais nova (ativa) para a mais antiga.
 *
 * v1 na instalação; v2 depois de recalibrar o LTC3588 (associação em
 * paralelo); v3 depois da falha de fixação do teste #017, com os piezos 6
 * (ruído) e 8 (par simétrico) desligados. Os testes antes da v3 registram a
 * v2 com 8 piezos.
 */
export const CONFIGURACOES_EXEMPLO: Configuracao[] = [
  {
    id: 'config-v3',
    instalacaoId: 'instalacao-pz01',
    nome: 'Config v3',
    versao: 3,
    piezosAtivos: 6,
    piezosTotal: 8,
    piezosInativos: [6, 8],
    associacao: 'paralelo',
    pontoInstalacao: PONTO_INSTALACAO,
    armazenamento: 'bateria',
    observacoes: 'Piezos 6 e 8 desligados após a falha de fixação de 02/10.',
    criadaEm: '2026-10-02T10:30:00-03:00',
  },
  {
    id: 'config-v2',
    instalacaoId: 'instalacao-pz01',
    nome: 'Config v2',
    versao: 2,
    piezosAtivos: 8,
    piezosTotal: 8,
    piezosInativos: [],
    associacao: 'paralelo',
    pontoInstalacao: PONTO_INSTALACAO,
    armazenamento: 'bateria',
    observacoes: 'Associação em paralelo após recalibrar o LTC3588.',
    criadaEm: '2026-09-20T16:00:00-03:00',
  },
  {
    id: 'config-v1',
    instalacaoId: 'instalacao-pz01',
    nome: 'Config v1',
    versao: 1,
    piezosAtivos: 8,
    piezosTotal: 8,
    piezosInativos: [],
    associacao: 'serie',
    pontoInstalacao: PONTO_INSTALACAO,
    armazenamento: 'bateria',
    observacoes: null,
    criadaEm: '2026-09-12T11:00:00-03:00',
  },
];

/** Revisões do sistema, da mais recente para a mais antiga (todas depois da instalação). */
export const REVISOES_EXEMPLO: Revisao[] = [
  {
    id: 'revisao-3',
    veiculoId: ID_CIVIC,
    instalacaoId: 'instalacao-pz01',
    motivo: 'Ruído no piezo 6 (traseiro esquerdo), desligado na Config v3.',
    status: 'agendada',
    criadaEm: '2026-10-03T09:15:00-03:00',
    atualizadaEm: '2026-10-03T14:40:00-03:00',
  },
  {
    id: 'revisao-2',
    veiculoId: ID_CIVIC,
    instalacaoId: 'instalacao-pz01',
    motivo: 'Refixação do piezo 7 após a falha do teste #017.',
    status: 'resolvida',
    criadaEm: '2026-10-02T08:50:00-03:00',
    atualizadaEm: '2026-10-02T10:20:00-03:00',
  },
  {
    id: 'revisao-1',
    veiculoId: ID_CIVIC,
    instalacaoId: 'instalacao-pz01',
    motivo: 'Recalibração do conversor LTC3588.',
    status: 'resolvida',
    criadaEm: '2026-09-18T10:00:00-03:00',
    atualizadaEm: '2026-09-20T15:30:00-03:00',
  },
];

/** Log do ESP32 hoje, do mais recente ao mais antigo (exemplo, só leitura). */
export const LOG_DISPOSITIVO_EXEMPLO: LinhaLog[] = [
  {
    instante: '2026-10-05T18:05:00-03:00',
    nivel: 'info',
    mensagem: 'Amostra 265 do teste #023 publicada (212 mW).',
  },
  { instante: '2026-10-05T18:04:57-03:00', nivel: 'info', mensagem: 'Heartbeat MQTT enviado.' },
  {
    instante: '2026-10-05T17:42:00-03:00',
    nivel: 'info',
    mensagem: 'Pico de potência do dia: 386 mW.',
  },
  {
    instante: '2026-10-05T17:21:00-03:00',
    nivel: 'info',
    mensagem: 'Teste #023 iniciado; amostragem a cada 10 s.',
  },
  {
    instante: '2026-10-05T17:20:12-03:00',
    nivel: 'info',
    mensagem: 'Conectado ao broker MQTT (sessão restaurada).',
  },
  {
    instante: '2026-10-05T08:35:00-03:00',
    nivel: 'info',
    mensagem: 'Teste #022 encerrado com 270 amostras.',
  },
  {
    instante: '2026-10-05T07:50:00-03:00',
    nivel: 'info',
    mensagem: 'Teste #022 iniciado; amostragem a cada 10 s.',
  },
  {
    instante: '2026-10-05T07:49:31-03:00',
    nivel: 'aviso',
    mensagem: 'Piezos 6 e 8 inativos pela Config v3.',
  },
  {
    instante: '2026-10-05T07:49:20-03:00',
    nivel: 'info',
    mensagem: 'Firmware 0.4.2 iniciado; Config v3 carregada.',
  },
];

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
  email: 'ana.silva@vers.com',
  emailVerificado: true,
  funcao: 'Administradora',
};
