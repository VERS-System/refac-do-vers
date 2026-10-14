/**
 * Processo principal do Electron do app desktop do VERS.
 *
 * Cria a janela principal no tamanho de referência do design (1512 × 982,
 * MacBook Pro 14"), com largura mínima de 1280 px, e carrega a interface:
 * em desenvolvimento a partir do servidor do electron-vite; em produção a
 * partir dos arquivos gerados em `out/renderer`.
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    minWidth: 1280,
    minHeight: 720,
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

void app.whenReady().then(criarJanelaPrincipal);

// No macOS o app continua ativo sem janelas; nos demais sistemas ele fecha.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// No macOS, clicar no ícone do dock recria a janela se nenhuma estiver aberta.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal();
});
