/**
 * Tela Criar conta do app desktop (referência: design-reference/09-criar-conta).
 *
 * Nesta fase mostra o painel da marca à direita, como na referência, e um
 * card de vidro com o link de volta ao Login. O cadastro em etapas (Conta,
 * Veículo, Instalação) entra na Fase 4.
 */

import { Link } from 'react-router-dom';
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout';
import { ROTAS } from '@/routes/navegacao';

/** Renderiza a tela Criar conta. */
export function CriarContaPage() {
  return (
    <AuthLayout
      brandSide="right"
      title="Que bom ter você aqui"
      description="Cadastre seu veículo e comece a medir a energia que a vibração gera em tempo real, ponto a ponto da suspensão ao acumulador."
    >
      <AuthCard>
        <h2 className="text-2xl font-semibold text-fg">Sua conta</h2>
        <p className="mt-1 text-sm text-fg-secondary">Preencha seus dados de acesso ao ecossistema VERS.</p>
        <p className="mt-6 text-[13px] text-fg-muted">Cadastro em etapas previsto na Fase 4.</p>
        <p className="mt-6 text-center text-[13px] text-fg-secondary">
          Já tem conta?{' '}
          <Link to={ROTAS.login} className="font-medium text-accent">
            Entrar
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
