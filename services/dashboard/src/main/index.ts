/**
 * Processo principal do Electron do app desktop do VERS.
 *
 * Cria a janela principal no tamanho de referência do design (1512 × 982,
 * MacBook Pro 14"), com mínimo de 800 × 600 (o layout é responsivo), e carrega a interface:
 * em desenvolvimento a partir do servidor do electron-vite; em produção a
 * partir dos arquivos gerados em `out/renderer`. A janela não abre outras
 * janelas nem navega para fora do app (`seguranca.ts`).
 */

import { app, BrowserWindow, ipcMain, net, session } from 'electron';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { navegacaoPermitida } from './seguranca';
import { criarSessao, remetentePermitido } from './sessao';
import { fetchDaSessao } from './rede-sessao';

/** Pasta deste arquivo compilado; substitui `__dirname`, que não existe em ESM. */
const diretorioAtual = fileURLToPath(new URL('.', import.meta.url));

let janelaPrincipal: BrowserWindow | null = null;

/**
 * Cria a janela principal e carrega a interface.
 *
 * Existe para concentrar as opções de segurança (isolamento de contexto, sem
 * integração com Node na interface) e de tamanho da janela num só lugar.
 * Usa a URL do servidor de desenvolvimento quando o electron-vite a informa e,
 * caso contrário, abre o HTML já compilado.
 */
function criarJanelaPrincipal(): void {
  janelaPrincipal = new BrowserWindow({
    width: 1512,
    height: 982,
    // O layout é responsivo (de 360 px a telas grandes); a janela pode ficar
    // menor que a referência, até 800 × 600 (por exemplo, com a tela dividida).
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#242423',
    show: false,
    autoHideMenuBar: true,
    title: 'VERS',
    webPreferences: {
      preload: join(diretorioAtual, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Nada de janelas novas nem navegação para fora do app (links externos,
  // arquivos locais): só a troca de tela, que muda apenas o hash.
  janelaPrincipal.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  janelaPrincipal.webContents.on('will-navigate', (evento, destino) => {
    const atual = janelaPrincipal?.webContents.getURL() ?? '';
    if (!navegacaoPermitida(destino, atual)) evento.preventDefault();
  });

  // Mostra a janela só quando a interface está pronta, evitando o flash branco.
  janelaPrincipal.once('ready-to-show', () => janelaPrincipal?.show());
  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null;
  });

  const urlDesenvolvimento = process.env['ELECTRON_RENDERER_URL'];
  if (urlDesenvolvimento) {
    void janelaPrincipal.loadURL(urlDesenvolvimento);
  } else {
    void janelaPrincipal.loadFile(join(diretorioAtual, '../renderer/index.html'));
  }
}

/** Registra a ponte após iniciar o Chromium, mantendo cookies fora da sessão do renderer. */
void app.whenReady().then(() => {
  const sessaoApi = session.fromPartition('persist:vers-api');
  const executar = criarSessao({ fetch: fetchDaSessao(net, sessaoApi), cookies: sessaoApi.cookies },
    process.env['VERS_DESKTOP_API_URL'] ?? 'http://localhost:3000/api/v1');
  const pagina = process.env['ELECTRON_RENDERER_URL']
    ?? pathToFileURL(join(diretorioAtual, '../renderer/index.html')).href;
  ipcMain.handle('vers:sessao', (evento, acao: unknown, dados: unknown) => {
    if (!janelaPrincipal || !remetentePermitido(evento, janelaPrincipal.webContents, pagina)) {
      return { ok: false, status: 403, erro: 'REMETENTE_INVALIDO' };
    }
    return executar(acao, dados);
  });
  criarJanelaPrincipal();
});

// No macOS o app continua ativo sem janelas; nos demais sistemas ele fecha.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// No macOS, clicar no ícone do dock recria a janela se nenhuma estiver aberta.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal();
});
