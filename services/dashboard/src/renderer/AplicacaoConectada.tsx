/** Inicia autenticação real; áreas ainda não integradas permanecem explicitamente demonstrativas. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import App from './App';
import { criarAutenticacao } from './data/autenticacao';
import { criarRepositorioMock } from './data/repositorioMock';
import { ErroRepositorio } from './data/erros';
import type { Usuario } from './data/tipos';
import { EstadoErro } from './components/ui/EstadoConsulta';
import { consumirDestino } from './stores/destinoBusca';

type Estado = { tipo: 'carregando' | 'erro' | 'pronto'; usuario: Usuario | null; expirada?: boolean };

/** Restaura a sessão e remonta cache/repositório quando muda a conta autenticada. */
export function AplicacaoConectada() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando', usuario: null });
  const revisao = useRef(0);
  const [autenticacao] = useState(() => criarAutenticacao(window.vers?.sessao, (usuario, expirada) => {
    revisao.current++;
    consumirDestino('teste'); consumirDestino('veiculo'); consumirDestino('secao');
    setEstado(anterior => ({ tipo: 'pronto', usuario, expirada: !!expirada && !!anterior.usuario }));
  }));
  const identidade = estado.usuario?.id;
  const repositorio = useMemo(() => ({ ...criarRepositorioMock(), ...autenticacao, fotoLocalPermitida: false }), [autenticacao, identidade]);

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
