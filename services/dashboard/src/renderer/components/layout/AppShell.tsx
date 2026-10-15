/**
 * Shell das telas internas: sidebar fixa à esquerda e a tela atual à direita.
 *
 * Usado como rota de layout no `App`: a tela de cada rota filha aparece no
 * `Outlet`. Usuário e dispositivo vêm dos hooks de dados (hoje, o
 * repositório de exemplo). Também aplica as preferências que valem no app
 * todo: as unidades de exibição e o "reduzir movimento".
 */

import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispositivo, useUsuarioAtual } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';
import { usePreferencias } from '@/stores/preferencias';
import { Sidebar } from './Sidebar';

/**
 * Renderiza a sidebar e a área principal da tela.
 *
 * Sair só volta para o Login: ainda não existe sessão real para encerrar.
 * A tela é remontada quando as unidades mudam (a chave do `main` muda), para
 * que todos os valores sejam formatados de novo na unidade escolhida.
 * "Reduzir movimento" vira o atributo `data-reduzir-movimento` no `<html>`,
 * que o CSS global usa para desligar as animações.
 */
export function AppShell() {
  const navegar = useNavigate();
  const { data: usuario } = useUsuarioAtual();
  const { data: dispositivo } = useDispositivo();
  const unidades = usePreferencias((estado) => estado.unidades);
  const reduzirMovimento = usePreferencias((estado) => estado.reduzirMovimento);

  useEffect(() => {
    const raiz = document.documentElement;
    if (reduzirMovimento) raiz.dataset.reduzirMovimento = 'true';
    else delete raiz.dataset.reduzirMovimento;
  }, [reduzirMovimento]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar usuario={usuario} dispositivo={dispositivo} onSair={() => navegar(ROTAS.login)} />
      <main
        key={`${unidades.potencia}-${unidades.energia}-${unidades.aceleracao}`}
        className="flex min-w-0 flex-1 flex-col"
      >
        <Outlet />
      </main>
    </div>
  );
}
