/**
 * Tela Login do app desktop (referência: design-reference/08-login).
 *
 * Nesta fase mostra o painel da marca e um card de vidro com o botão Entrar,
 * que leva direto à Visão geral (ainda não há autenticação). O formulário
 * completo (e-mail, senha, manter conectado, login social) entra na Fase 4.
 */

import { Link, useNavigate } from 'react-router-dom';
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { ROTAS } from '@/routes/navegacao';

/** Renderiza a tela Login. */
export function LoginPage() {
  const navegar = useNavigate();
  return (
    <AuthLayout
      title="Bem-vindo de volta"
      description="Entre com suas credenciais e acompanhe a energia do seu sistema."
    >
      <AuthCard>
        <h2 className="text-2xl font-semibold text-fg">Entrar</h2>
        <p className="mt-1 text-sm text-fg-secondary">Acesse o painel do VERS</p>
        <p className="mt-6 text-[13px] text-fg-muted">Formulário de acesso previsto na Fase 4.</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => navegar(ROTAS.visaoGeral)}>
          Entrar
        </Button>
        <p className="mt-6 text-center text-[13px] text-fg-secondary">
          Não tem conta?{' '}
          <Link to={ROTAS.criarConta} className="font-medium text-accent underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
