/** Confere os limites de identidade e de remetente no registro IPC do Electron. */
import { afterAll, expect, it, vi } from 'vitest';

const ambiente = vi.hoisted(() => {
  const frame = { url: 'http://localhost:5174' };
  const webContents = { mainFrame: frame, setWindowOpenHandler: vi.fn(), on: vi.fn(),
    getURL: () => frame.url, isDestroyed: () => false, send: vi.fn() };
  const janela = { webContents, on: vi.fn(), once: vi.fn(), loadURL: vi.fn(), loadFile: vi.fn(), show: vi.fn() };
  return { frame, janela, handlers: new Map<string, (...args: any[]) => unknown>(),
    cookies: { get: vi.fn().mockResolvedValue([{ value: 'cookie.sintetico.local' }]) },
    executar: vi.fn().mockResolvedValue({ ok: true }), cadastro: vi.fn().mockResolvedValue({ ok: true }),
    ensaios: vi.fn().mockResolvedValue({ ok: true }), observar: vi.fn().mockReturnValue({ ok: true }), encerrar: vi.fn(),
    criarTempoReal: vi.fn(), fromPartition: vi.fn() };
});

vi.mock('electron', () => ({
  app: { whenReady: () => Promise.resolve(), on: vi.fn(), quit: vi.fn() }, net: {},
  BrowserWindow: class { constructor() { return ambiente.janela; } static getAllWindows() { return [ambiente.janela]; } },
  ipcMain: { handle: (canal: string, handler: (...args: any[]) => unknown) => ambiente.handlers.set(canal, handler) },
  session: { fromPartition: ambiente.fromPartition.mockReturnValue({ cookies: ambiente.cookies }) },
}));
vi.mock('./rede-sessao', () => ({ fetchDaSessao: vi.fn() }));
// O Vite do teste usa URL HTTP; somente a localização do bundle é substituída.
vi.mock('node:url', async () => ({ ...await vi.importActual('node:url'), fileURLToPath: () => 'C:/vers-teste/out/main/' }));
vi.mock('./cadastro', () => ({ criarCadastro: () => ambiente.cadastro }));
vi.mock('./ensaios', () => ({ criarEnsaios: () => ambiente.ensaios }));
vi.mock('./sessao', async () => ({ ...await vi.importActual('./sessao'), criarSessao: () => ambiente.executar }));
vi.mock('./realtime', () => ({ criarTempoReal: ambiente.criarTempoReal.mockReturnValue({ observar: ambiente.observar, encerrar: ambiente.encerrar }) }));

const enderecoAnterior = process.env.ELECTRON_RENDERER_URL;
const apiAnterior = process.env.VERS_DESKTOP_API_URL;
afterAll(() => {
  if (enderecoAnterior === undefined) delete process.env.ELECTRON_RENDERER_URL;
  else process.env.ELECTRON_RENDERER_URL = enderecoAnterior;
  if (apiAnterior === undefined) delete process.env.VERS_DESKTOP_API_URL;
  else process.env.VERS_DESKTOP_API_URL = apiAnterior;
});

it('restringe remetente, cookies, fila e descarte ao ciclo da janela/sessão', async () => {
  process.env.ELECTRON_RENDERER_URL = 'http://localhost:5174';
  process.env.VERS_DESKTOP_API_URL = 'http://localhost:3000/api/v1';
  await import('./index'); await Promise.resolve();
  const observar = ambiente.handlers.get('vers:tempo-real')!;
  const sessao = ambiente.handlers.get('vers:sessao')!;
  const ensaios = ambiente.handlers.get('vers:ensaios')!;
  const remetente = { sender: ambiente.janela.webContents, senderFrame: ambiente.frame };
  const dados = { observacao: '11111111-1111-4111-8111-111111111111', recursos: [] };
  for (const invalido of [{ ...remetente, sender: {} }, { ...remetente, senderFrame: null },
    { ...remetente, senderFrame: { url: ambiente.frame.url } }]) {
    expect(await observar(invalido, dados)).toMatchObject({ status: 403 });
  }
  expect(ambiente.observar).not.toHaveBeenCalled();
  await observar(remetente, dados); expect(ambiente.observar).toHaveBeenCalledWith(dados);
  expect(ambiente.fromPartition).toHaveBeenCalledWith('persist:vers-api');
  const preparar = ambiente.criarTempoReal.mock.calls[0][1];
  const notificar = ambiente.criarTempoReal.mock.calls[0][2];
  expect(await preparar()).toEqual({ ok: true, cookie: 'vers_access=cookie.sintetico.local' });
  expect(ambiente.cookies.get).toHaveBeenCalledExactlyOnceWith({ url: 'http://localhost:3000/api/v1', name: 'vers_access' });
  ambiente.cookies.get.mockResolvedValueOnce([]);
  expect(await preparar()).toMatchObject({ ok: false });
  ambiente.executar.mockResolvedValueOnce({ ok: false, status: 401, erro: 'HTTP' });
  const quantidade = ambiente.cookies.get.mock.calls.length;
  expect(await preparar()).toMatchObject({ status: 401 });
  expect(ambiente.cookies.get).toHaveBeenCalledTimes(quantidade);
  const aviso = { observacao: dados.observacao, tipo: 'desconectado' };
  notificar(aviso); expect(ambiente.janela.webContents.send).toHaveBeenCalledWith('vers:tempo-real:aviso', aviso);
  for (const acao of ['entrar', 'sair', 'sairDeTodas']) {
    ambiente.encerrar.mockClear(); ambiente.executar.mockClear();
    await sessao(remetente, acao);
    expect(ambiente.encerrar).toHaveBeenCalledOnce();
    expect(ambiente.encerrar.mock.invocationCallOrder[0]).toBeLessThan(ambiente.executar.mock.invocationCallOrder[0]);
  }
  ambiente.ensaios.mockResolvedValueOnce({ ok: false, status: 401, erro: 'HTTP' });
  ambiente.encerrar.mockClear(); await ensaios(remetente, 'listar', {});
  expect(ambiente.encerrar).toHaveBeenCalledOnce();
  ambiente.encerrar.mockClear();
  ambiente.janela.webContents.on.mock.calls.find(([nome]) => nome === 'did-start-loading')![1]();
  ambiente.janela.on.mock.calls.find(([nome]) => nome === 'closed')![1]();
  expect(ambiente.encerrar).toHaveBeenCalledTimes(2);
  expect(await observar(remetente, dados)).toMatchObject({ status: 403 });
});
