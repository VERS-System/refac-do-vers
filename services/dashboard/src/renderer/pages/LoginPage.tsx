/**
 * Tela Login do app desktop (referência: design-reference/08-login).
 *
 * E-mail e senha (`LoginRequest`), validados antes do envio; as recusas do
 * backend (credenciais inválidas, limite de tentativas, serviço fora) têm
 * mensagens próprias, sem revelar se a conta existe. Login social e "Manter
 * conectado" ficam fora (task D02, sem contrato); "Esqueci a senha" avisa
 * que depende da API. Depois de entrar, quem criou a conta neste computador
 * vai ao Primeiro veículo para gravar o carro digitado no cadastro. Planos em
 * `.AIs/docs/plans/desktop-frontend-autenticacao.md` e
 * `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`.
 */

import { useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { AvisoErro, CampoSenha } from '@/components/autenticacao/Campos';
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { emailValido } from '@/data/calculos';
import { ErroRepositorio } from '@/data/erros';
import { lerVeiculoDoCadastro } from '@/data/veiculoDoCadastro';
import { useAcoesAutenticacao } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';

/** Avisos que outras telas podem deixar para o Login (via `state` da navegação). */
export type AvisoLogin = 'sessoes-encerradas' | 'sessao-expirada';

const TEXTO_AVISO: Record<AvisoLogin, string> = {
  'sessoes-encerradas': 'Todas as sessões foram encerradas. Entre de novo.',
  'sessao-expirada': 'Sua sessão expirou. Entre de novo.',
};

/** Mensagem da recusa do login, pelo código do erro. */
function mensagemDeRecusa(erro: unknown): string {
  if (erro instanceof ErroRepositorio) {
    if (erro.codigo === 'credenciais-invalidas') return 'E-mail ou senha incorretos.';
    if (erro.codigo === 'limite-tentativas') {
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    }
    if (erro.codigo === 'validacao') return erro.message;
  }
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

/** Renderiza a tela Login. */
export function LoginPage() {
  const navegar = useNavigate();
  const local = useLocation();
  const { entrar } = useAcoesAutenticacao();
  const idEmail = useId();
  const idSenha = useId();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [recusa, setRecusa] = useState<string | null>(null);
  const [avisoSenha, setAvisoSenha] = useState(false);
  const aviso = (local.state as { aviso?: AvisoLogin } | null)?.aviso;

  /** Valida os campos, foca o primeiro inválido e, se tudo certo, entra. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos = {
      email: emailValido(email) ? undefined : 'Informe um e-mail válido.',
      senha: senha ? undefined : 'Informe a senha.',
    };
    setErros(novos);
    setRecusa(null);
    if (novos.email || novos.senha) {
      document.getElementById(novos.email ? idEmail : idSenha)?.focus();
      return;
    }
    try {
      await entrar.mutateAsync({ email: email.trim(), senha });
      // Primeiro acesso de quem criou a conta neste computador: grava o carro digitado.
      navegar(lerVeiculoDoCadastro(email) ? ROTAS.primeiroVeiculo : ROTAS.visaoGeral);
    } catch (erro) {
      setRecusa(mensagemDeRecusa(erro));
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      description="Entre com suas credenciais e acompanhe a energia do seu sistema."
    >
      <AuthCard>
        <h2 className="text-2xl font-semibold text-fg">Entrar</h2>
        <p className="mt-1 text-sm text-fg-secondary">Acesse o painel do VERS</p>
        {aviso && (
          <p
            role="status"
            className="mt-5 rounded-control border border-accent-border bg-accent-subtle px-4 py-2.5 text-[13px] text-accent"
          >
            {TEXTO_AVISO[aviso]}
          </p>
        )}
        <form noValidate onSubmit={(e) => void enviar(e)} className="mt-6 flex flex-col gap-5">
          <Input
            id={idEmail}
            label="E-mail"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={erros.email}
          />
          <CampoSenha
            id={idSenha}
            label="Senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={erros.senha}
          />
          <div className="-mt-1 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setAvisoSenha(true)}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Esqueci a senha
            </button>
            <p aria-live="polite" className="text-xs text-fg-muted">
              {avisoSenha ? 'Recuperação de senha disponível com a API.' : ''}
            </p>
          </div>
          {recusa && <AvisoErro>{recusa}</AvisoErro>}
          <Button type="submit" size="lg" className="w-full" disabled={entrar.isPending}>
            {entrar.isPending ? (
              'Entrando…'
            ) : (
              <>
                Entrar
                <ArrowRight aria-hidden="true" size={18} />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-fg-secondary">
          Não tem conta?{' '}
          <Link
            to={ROTAS.criarConta}
            className="font-medium text-accent underline underline-offset-4"
          >
            Criar conta
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
