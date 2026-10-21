/**
 * Tela Primeiro veículo do app desktop: grava, no primeiro acesso, o carro
 * digitado no Criar conta.
 *
 * Na API, o veículo só pode ser criado por uma conta logada (`POST
 * /vehicles`); o Criar conta guarda o carro neste computador e o Login, ao
 * reconhecer o e-mail, traz a pessoa para cá. Os campos chegam preenchidos e
 * podem ser corrigidos. "Cadastrar veículo" grava e "Pular por agora" esquece
 * o registro (o carro pode ser cadastrado depois na tela Veículos); nos dois
 * casos o app segue para a Visão geral. Sem veículo guardado, vai direto
 * para lá. Fica fora do shell, no layout do Login. Plano em
 * `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`.
 */

import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AvisoErro } from '@/components/autenticacao/Campos';
import {
  CamposDoVeiculo,
  VEICULO_VAZIO,
  anoDoVeiculo,
  validarVeiculo,
  type CamposVeiculo,
  type ErrosVeiculo,
} from '@/components/autenticacao/CamposVeiculo';
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { ErroRepositorio } from '@/data/erros';
import { apagarVeiculoDoCadastro, lerVeiculoDoCadastro } from '@/data/veiculoDoCadastro';
import { useAcoesVeiculo, useUsuarioAtual } from '@/hooks/useDados';
import { useRepositorio } from '@/data/repositorio';
import { EstadoErro } from '@/components/ui/EstadoConsulta';
import { ROTAS } from '@/routes/navegacao';

/** Mensagem da recusa: a do repositório quando explica o motivo (placa repetida, validação). */
function mensagemDeRecusa(erro: unknown): string {
  if (
    erro instanceof ErroRepositorio &&
    (erro.codigo === 'conflito' || erro.codigo === 'validacao')
  ) {
    return erro.message;
  }
  return 'Não foi possível cadastrar o veículo agora. Tente de novo em instantes.';
}

/** Renderiza a tela Primeiro veículo (ou leva à Visão geral, se não houver o que gravar). */
export function PrimeiroVeiculoPage() {
  const real = useRepositorio().cadastroReal;
  const usuario = useUsuarioAtual();
  if (real && usuario.isPending) return <p role="status">Consultando conta…</p>;
  if (real && usuario.isError) return <EstadoErro mensagem="Não foi possível consultar a conta." onTentarNovamente={() => void usuario.refetch()} />;
  return <ConteudoPrimeiroVeiculo key={real ? usuario.data?.email : 'demo'} email={real ? usuario.data?.email : undefined} />;
}

/** Lê o rascunho somente da conta confirmada, mantendo o formulário isolado por email. */
function ConteudoPrimeiroVeiculo({ email }: { email?: string }) {
  const navegar = useNavigate();
  const { criar } = useAcoesVeiculo();
  const [guardado] = useState(() => lerVeiculoDoCadastro(email));
  const [veiculo, setVeiculo] = useState<CamposVeiculo>(guardado ?? VEICULO_VAZIO);
  const [erros, setErros] = useState<ErrosVeiculo>({});
  const [recusa, setRecusa] = useState<string | null>(null);

  if (!guardado) return <Navigate to={ROTAS.visaoGeral} replace />;

  /** Valida, grava o carro e esquece o registro guardado; a recusa mantém o registro. */
  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    const novos = validarVeiculo(veiculo);
    setErros(novos);
    setRecusa(null);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await criar.mutateAsync({
        placa: veiculo.placa,
        fabricante: veiculo.fabricante,
        modelo: veiculo.modelo,
        ano: anoDoVeiculo(veiculo),
      });
      apagarVeiculoDoCadastro();
      navegar(ROTAS.visaoGeral, { replace: true });
    } catch (erro) {
      setRecusa(mensagemDeRecusa(erro));
    }
  }

  /** Esquece o veículo guardado sem gravar e segue para o app. */
  function pular() {
    apagarVeiculoDoCadastro();
    navegar(ROTAS.visaoGeral, { replace: true });
  }

  return (
    <AuthLayout
      title="Falta só o seu veículo"
      description="Confirme o carro onde o VERS está instalado para começar a medir a energia que a vibração gera."
    >
      <AuthCard>
        <h2 className="text-2xl font-semibold text-fg">Cadastre seu veículo</h2>
        <p className="mt-1 text-sm text-fg-secondary">
          Trouxemos o que você digitou ao criar a conta. Confira e confirme.
        </p>
        <form noValidate onSubmit={(e) => void cadastrar(e)} className="mt-6 flex flex-col gap-5">
          <CamposDoVeiculo veiculo={veiculo} erros={erros} onVeiculo={setVeiculo} />
          {recusa && <AvisoErro>{recusa}</AvisoErro>}
          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full" disabled={criar.isPending}>
              {criar.isPending ? 'Cadastrando…' : 'Cadastrar veículo'}
            </Button>
            <Button type="button" variant="ghost" size="lg" className="w-full" onClick={pular}>
              Pular por agora
            </Button>
          </div>
        </form>
        <p className="mt-5 text-center text-xs text-fg-muted">
          Se pular, você pode cadastrar o carro depois, em Veículos.
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
