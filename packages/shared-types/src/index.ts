// Ponto de entrada público dos contratos compartilhados da plataforma VERS.

export * from './api';
export * from './auth';
export * from './fixtures';
export * from './users';
export * from './vehicles';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'technician';
  createdAt: string;
}

export interface Telemetry {
  id: string;
  testeId: string;
  timestamp: string;
  tensao: number;
  corrente: number;
  potencia: number;
  energia: number;
  aceleracaoX?: number;
  aceleracaoY?: number;
  aceleracaoZ?: number;
}

export interface Teste {
  id: string;
  inicio: string;
  fim?: string;
  veiculo?: string;
  configuracaoId?: string;
}

export interface Configuracao {
  id: string;
  numPiezos: number;
  associacao: 'serie' | 'paralelo' | 'misto';
  tipoArmazenamento: string;
}
