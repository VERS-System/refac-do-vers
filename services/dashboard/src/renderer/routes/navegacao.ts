/**
 * Itens da navegação principal do app desktop, na ordem do DESIGN.md.
 *
 * A sidebar e as rotas usam esta lista como fonte única dos caminhos, para
 * que um item de menu nunca aponte para uma rota inexistente.
 */

import {
  Activity,
  Car,
  CarFront,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Zap,
} from 'lucide-react';
import type { IconComponent } from '@/components/ui/Button';
import { ViberMark } from '@/components/ui/ViberMark';

export interface ItemNavegacao {
  path: string;
  label: string;
  icon: IconComponent;
}

export const ROTAS = {
  visaoGeral: '/visao-geral',
  telemetria: '/telemetria',
  energia: '/energia',
  testes: '/testes',
  veiculos: '/veiculos',
  veiculoInstalacao: '/veiculo-instalacao',
  viberIa: '/viber-ia',
  configuracoes: '/configuracoes',
  login: '/login',
  criarConta: '/criar-conta',
  primeiroVeiculo: '/primeiro-veiculo',
} as const;

export const NAVEGACAO_PRINCIPAL: ItemNavegacao[] = [
  { path: ROTAS.visaoGeral, label: 'Visão geral', icon: LayoutDashboard },
  { path: ROTAS.telemetria, label: 'Telemetria', icon: Activity },
  { path: ROTAS.energia, label: 'Energia', icon: Zap },
  { path: ROTAS.testes, label: 'Testes', icon: FlaskConical },
  { path: ROTAS.veiculos, label: 'Veículos', icon: CarFront },
  { path: ROTAS.veiculoInstalacao, label: 'Veículo e instalação', icon: Car },
  { path: ROTAS.viberIa, label: 'Viber IA', icon: ViberMark },
  { path: ROTAS.configuracoes, label: 'Configurações', icon: Settings },
];
