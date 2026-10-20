/** Inicia autenticação real; áreas ainda não integradas permanecem explicitamente demonstrativas. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import App from './App';
import { criarAutenticacao } from './data/autenticacao';
import { criarRepositorioMock } from './data/repositorioMock';
import { ErroRepositorio } from './data/erros';
import type { Usuario } from './data/tipos';
import { EstadoErro } from './components/ui/EstadoConsulta';
import { consumirDestino } from './stores/destinoBusca';
import { criarCadastro } from './data/cadastro';
import { useSelecaoInstalacao } from './stores/instalacao';

type Estado = { tipo: 'carregando' | 'erro' | 'pronto'; usuario: Usuario | null; expirada?: boolean };

/** Restaura a sessão e remonta cache/repositório quando muda a conta autenticada. */
export function AplicacaoConectada() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando', usuario: null });
  const revisao = useRef(0);
  const [{ autenticacao, cadastro }] = useState(() => {
    /** Troca a identidade e apaga escolhas que pertencem à conta anterior. */
    const alterar = (usuario: Usuario | null, expirada?: true) => {
      revisao.current++;
      consumirDestino('teste'); consumirDestino('veiculo'); consumirDestino('secao');
      useSelecaoInstalacao.setState({ escolhas: {} });
      setEstado(anterior => ({ tipo: 'pronto', usuario, expirada: !!expirada && !!anterior.usuario }));
    };
    return { autenticacao: criarAutenticacao(window.vers?.sessao, alterar),
      cadastro: criarCadastro(window.vers?.cadastro, () => alterar(null, true)) };
  });
  const identidade = estado.usuario?.id;
  useEffect(() => { useSelecaoInstalacao.setState({ escolhas: {} }); }, [identidade]);
  const repositorio = useMemo(() => ({ ...criarRepositorioMock(), ...autenticacao, ...cadastro,
    fotoLocalPermitida: false, agora: () => new Date() }), [autenticacao, cadastro, identidade]);

  /** Separa 401 de indisponibilidade e ignora respostas de uma identidade anterior. */
  const verificar = useCallback(async () => {
    const atual = ++revisao.current;
    try {
      const usuario = await autenticacao.obterUsuarioAtual();
      if (atual === revisao.current) setEstado({ tipo: 'pronto', usuario });
    } catch (erro) {
      if (atual === revisao.current) setEstado({ tipo: erro instanceof ErroRepositorio && erro.codigo === 'sessao-expirada' ? 'pronto' : 'erro', usuario: null });
    }
  }, [autenticacao]);

  useEffect(() => {
    void verificar();
    return () => { revisao.current++; };
  }, [verificar]);

  useEffect(() => {
    if (!identidade) return;
    const conferir = () => { void verificar(); };
    window.addEventListener('focus', conferir);
    return () => window.removeEventListener('focus', conferir);
  }, [identidade, verificar]);

  if (estado.tipo === 'carregando') return <p role="status">Verificando sessão…</p>;
  if (estado.tipo === 'erro') return <main className="p-8"><EstadoErro mensagem="Não foi possível consultar a API local." onTentarNovamente={() => void verificar()} /></main>;
  return <App key={identidade ?? 'anonimo'} repositorio={repositorio} autenticado={!!identidade} sessaoExpirada={estado.expirada} aoSair={autenticacao.sair} />;
}
