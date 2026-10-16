/**
 * Tela Criar conta do app desktop (referência: design-reference/09-criar-conta).
 *
 * Cadastro em três etapas, como o Stitch: Conta (`RegisterRequest`, com os
 * requisitos da senha ao vivo), Veículo (`CreateVehicleRequest`) e
 * Instalação (resumo e próximos passos). Só a conta é enviada: na API o
 * veículo só pode ser criado por uma conta logada. Por isso o veículo fica
 * guardado neste computador e é gravado no primeiro acesso (tela Primeiro
 * veículo). A confirmação não revela se o e-mail já tinha conta. Planos em
 * `.AIs/docs/plans/desktop-frontend-autenticacao.md` e
 * `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Cpu, MailCheck, Mail, Lock, UserRound } from 'lucide-react';
import { AvisoErro, CampoSenha, Etapas, ListaRequisitos } from '@/components/autenticacao/Campos';
import {
  CamposDoVeiculo,
  VEICULO_VAZIO,
  validarVeiculo,
  type CamposVeiculo,
} from '@/components/autenticacao/CamposVeiculo';
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { emailValido, nomearVeiculo, normalizarPlaca, senhaValida } from '@/data/calculos';
import { ErroRepositorio } from '@/data/erros';
import { guardarVeiculoDoCadastro } from '@/data/veiculoDoCadastro';
import { useAcoesAutenticacao } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';

interface Conta {
  nome: string;
  email: string;
  senha: string;
  confirmacao: string;
}

type Erros = Partial<Record<keyof Conta | keyof CamposVeiculo, string>>;

/** Índice da tela final, depois das três etapas. */
const CONCLUIDO = 3;

/** Erros da etapa Conta (vazio se tudo certo). */
function validarConta(conta: Conta): Erros {
  return {
    email: emailValido(conta.email) ? undefined : 'Informe um e-mail válido.',
    senha: senhaValida(conta.senha) ? undefined : 'A senha não atende a todos os requisitos.',
    confirmacao:
      conta.confirmacao === conta.senha && conta.senha ? undefined : 'As senhas não coincidem.',
  };
}

/** Texto do veículo para o resumo e a tela final ("ABC1D23 · Honda CG 160"). */
function descreverCadastro(veiculo: CamposVeiculo): string {
  const placa = normalizarPlaca(veiculo.placa) ?? veiculo.placa;
  const nome = nomearVeiculo({
    fabricante: veiculo.fabricante.trim() || null,
    modelo: veiculo.modelo.trim() || null,
    ano: null,
  });
  return nome ? `${placa} · ${nome}` : placa;
}

/** Mensagem da recusa do cadastro, pelo código do erro. */
function mensagemDeRecusa(erro: unknown): string {
  if (erro instanceof ErroRepositorio && erro.codigo === 'validacao') return erro.message;
  return 'Não foi possível criar a conta agora. Tente de novo em instantes.';
}

/** Título da etapa, focado ao trocar de etapa para o leitor de tela acompanhar. */
function TituloEtapa({ children, descricao }: { children: ReactNode; descricao: string }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (document.activeElement && document.activeElement !== document.body) titulo.current?.focus();
  }, []);
  return (
    <div className="mt-6">
      <h2 ref={titulo} tabIndex={-1} className="text-2xl font-semibold text-fg outline-none">
        {children}
      </h2>
      <p className="mt-1 text-[13px] text-fg-secondary">{descricao}</p>
    </div>
  );
}

/** Renderiza a tela Criar conta. */
export function CriarContaPage() {
  const { registrar } = useAcoesAutenticacao();
  const [etapa, setEtapa] = useState(0);
  const [conta, setConta] = useState<Conta>({ nome: '', email: '', senha: '', confirmacao: '' });
  const [veiculo, setVeiculo] = useState<CamposVeiculo>(VEICULO_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [recusa, setRecusa] = useState<string | null>(null);

  /**
   * Valida a etapa atual e, se tudo certo, avança. Na última, envia a conta e
   * guarda o veículo (com a placa já normalizada) para o primeiro acesso.
   */
  async function avancar(evento: FormEvent) {
    evento.preventDefault();
    const novos = etapa === 0 ? validarConta(conta) : etapa === 1 ? validarVeiculo(veiculo) : {};
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    if (etapa < 2) {
      setEtapa(etapa + 1);
      return;
    }
    setRecusa(null);
    try {
      await registrar.mutateAsync({
        email: conta.email.trim(),
        senha: conta.senha,
        ...(conta.nome.trim() ? { nome: conta.nome.trim() } : {}),
      });
      guardarVeiculoDoCadastro(conta.email, {
        ...veiculo,
        placa: normalizarPlaca(veiculo.placa) ?? veiculo.placa,
      });
      setEtapa(CONCLUIDO);
    } catch (erro) {
      setRecusa(mensagemDeRecusa(erro));
    }
  }

  /** Volta uma etapa, mantendo o que foi digitado. */
  function voltar() {
    setErros({});
    setRecusa(null);
    setEtapa(etapa - 1);
  }

  return (
    <AuthLayout
      brandSide="right"
      title="Que bom ter você aqui"
      description="Cadastre seu veículo e comece a medir a energia que a vibração gera em tempo real, ponto a ponto da suspensão ao acumulador."
    >
      <AuthCard className="max-w-[476px]">
        {etapa === CONCLUIDO ? (
          <Concluido email={conta.email.trim()} veiculo={descreverCadastro(veiculo)} />
        ) : (
          <>
            <Etapas atual={etapa} />
            <form noValidate onSubmit={(e) => void avancar(e)}>
              {etapa === 0 && (
                <>
                  <TituloEtapa descricao="Preencha seus dados de acesso ao ecossistema VERS.">
                    Sua conta
                  </TituloEtapa>
                  <div className="mt-5 flex flex-col gap-4">
                    <Input
                      label="Nome completo"
                      icon={UserRound}
                      autoComplete="name"
                      value={conta.nome}
                      onChange={(e) => setConta({ ...conta, nome: e.target.value })}
                    />
                    <Input
                      label="E-mail"
                      type="email"
                      icon={Mail}
                      autoComplete="email"
                      value={conta.email}
                      onChange={(e) => setConta({ ...conta, email: e.target.value })}
                      error={erros.email}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <CampoSenha
                        label="Senha"
                        autoComplete="new-password"
                        value={conta.senha}
                        onChange={(e) => setConta({ ...conta, senha: e.target.value })}
                        error={erros.senha}
                      />
                      <Input
                        label="Confirmar senha"
                        type="password"
                        icon={Lock}
                        autoComplete="new-password"
                        value={conta.confirmacao}
                        onChange={(e) => setConta({ ...conta, confirmacao: e.target.value })}
                        error={erros.confirmacao}
                      />
                    </div>
                    <ListaRequisitos senha={conta.senha} />
                  </div>
                </>
              )}
              {etapa === 1 && (
                <>
                  <TituloEtapa descricao="O veículo onde o VERS está instalado. Só a placa é obrigatória.">
                    Seu veículo
                  </TituloEtapa>
                  <div className="mt-5">
                    <CamposDoVeiculo veiculo={veiculo} erros={erros} onVeiculo={setVeiculo} />
                  </div>
                </>
              )}
              {etapa === 2 && (
                <>
                  <TituloEtapa descricao="Confira os dados e veja o que acontece depois.">
                    Instalação
                  </TituloEtapa>
                  <ul
                    aria-label="Resumo do cadastro"
                    className="mt-5 flex flex-col gap-2 rounded-control border border-line-subtle bg-inset px-4 py-3 text-[13px]"
                  >
                    <li className="flex justify-between gap-3">
                      <span className="text-fg-muted">Conta</span>
                      <span className="font-mono text-fg">{conta.email.trim()}</span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span className="text-fg-muted">Veículo</span>
                      <span className="font-mono text-fg">{descreverCadastro(veiculo)}</span>
                    </li>
                  </ul>
                  <p className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-fg-secondary">
                    <Cpu aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />O ESP32
                    e os piezos são associados ao veículo depois do primeiro acesso, em Veículo e
                    instalação, quando a API estiver disponível.
                  </p>
                  {recusa && (
                    <div className="mt-4">
                      <AvisoErro>{recusa}</AvisoErro>
                    </div>
                  )}
                </>
              )}
              <div className="mt-6 flex gap-3">
                {etapa > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    icon={ArrowLeft}
                    onClick={voltar}
                  >
                    Voltar
                  </Button>
                )}
                <Button type="submit" size="lg" className="flex-1" disabled={registrar.isPending}>
                  {etapa === 2 ? (
                    registrar.isPending ? (
                      'Criando conta…'
                    ) : (
                      'Criar conta'
                    )
                  ) : (
                    <>
                      Continuar
                      <ArrowRight aria-hidden="true" size={18} />
                    </>
                  )}
                </Button>
              </div>
            </form>
            <p className="mt-6 text-center text-[13px] text-fg-secondary">
              Já tem conta?{' '}
              <Link to={ROTAS.login} className="font-medium text-accent">
                Entrar
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

/** Tela final: confirmação do e-mail, sem revelar se ele já tinha conta, e o veículo guardado. */
function Concluido({ email, veiculo }: { email: string; veiculo: string }) {
  return (
    <div className="flex flex-col">
      <span className="grid size-12 place-items-center rounded-full bg-accent-subtle text-accent">
        <MailCheck aria-hidden="true" size={22} />
      </span>
      <TituloEtapa descricao="Falta só um passo para entrar no VERS.">
        Confirme seu e-mail
      </TituloEtapa>
      <p className="mt-5 text-sm leading-6 text-fg-secondary">
        {`Se o e-mail ${email} puder ser usado, você receberá um link de confirmação. Depois de confirmar, entre com seu e-mail e senha.`}
      </p>
      <p className="mt-3 text-[13px] leading-5 text-fg-muted">
        {`O veículo ${veiculo} fica guardado neste computador e é cadastrado no seu primeiro acesso.`}
      </p>
      <Link
        to={ROTAS.login}
        className="mt-6 flex h-12 items-center justify-center rounded-full bg-accent text-[15px] font-medium text-fg-on-accent hover:bg-accent-hover"
      >
        Ir para o Login
      </Link>
    </div>
  );
}
