/**
 * Shell das telas internas: sidebar fixa à esquerda e a tela atual à direita.
 *
 * Usado como rota de layout no `App`: a tela de cada rota filha aparece no
 * `Outlet`. Usuário e dispositivo vêm dos hooks de dados (hoje, o
 * repositório de exemplo).
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { useDispositivo, useUsuarioAtual } from '@/hooks/useDados';
import { ROTAS } from '@/routes/navegacao';
import { Sidebar } from './Sidebar';

/**
 * Renderiza a sidebar e a área principal da tela.
 *
 * Sair só volta para o Login: ainda não existe sessão real para encerrar.
 */
export function AppShell() {
  const navegar = useNavigate();
  const { data: usuario } = useUsuarioAtual();
  const { data: dispositivo } = useDispositivo();
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar usuario={usuario} dispositivo={dispositivo} onSair={() => navegar(ROTAS.login)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
