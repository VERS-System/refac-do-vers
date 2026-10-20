<!-- Planeja e registra a prova de sessão local no Electron. -->
# Lote 1 — sessão Electron

Autorizado em 20/10/2026. API local da demonstração; sessão deve permanecer
ao reabrir até expirar ou ser encerrada. Sem deploy ou mudança no backend.

Implementar transporte de sessão no main com uma partição persistente exclusiva,
operações fixas e verificação do remetente IPC. O renderer não recebe cookies,
tokens, URLs configuráveis ou cabeçalhos. CSRF obtido antes de cada mutação;
Origin fixo da bancada já permitido pelo backend. HTTP limitado a localhost
para manter o mesmo site da origem; 127.0.0.1 e ::1 não são intercambiáveis.
O transporte não deve aceitar redirecionamentos nem repetir mutações.

Arquivos: main/sessao.ts e testes, shared/sessao.ts, preload/index.ts,
main/index.ts, configuração de testes/build, documentação e contexto diário.
As telas continuam usando o repositório atual até o lote 2.

TDD: validação de URL/payload, rotas, CSRF, erros, persistência, concorrência
e remetente IPC. Depois test:unit, typecheck e build sem leitura de .env.
Ensaio Electron real em desenvolvimento/build e reabertura é obrigatório para
fechar o lote; testes de fetch simulado não substituem essa evidência.

## Evidências e resultado

Implementados main/sessao.ts, main/rede-sessao.ts, tipos shared/sessao.ts e
ponte preload. IPC verifica janela, frame principal e página; valida operação
e payload; retorna apenas perfil público/erro seguro. Fila serializa operações
para evitar colisão de CSRF/refresh. Prazo de 10 segundos e resposta até 1 MiB;
sem repetição de mutações e sem redirecionamento. Cookies na partição
`persist:vers-api`, separada do renderer e gravada após mutações.

`session.fetch` com cabeçalho Origin não foi suficiente: ensaio encontrou 403
no login. `net.request` com origin explícito e useSessionCookies resolveu.
Referência: [ClientRequest](https://www.electronjs.org/docs/latest/api/client-request).
Usar apenas `http://localhost:<porta>/api/v1`, padrão porta3000;
`VERS_DESKTOP_API_URL` é configuração pública do main, nunca fornecida pelo IPC.
Nenhuma alteração de CORS, CSRF, SameSite ou guard no backend.

Scripts scripts/session-rehearsal.mjs e session-electron.cjs executaram o app
compilado/preload verdadeiro, com renderer Vite em localhost5175 e depois
loadFile do build. Seis instâncias independentes passaram: login, reabertura
com perfil/refresh/logout e nova abertura sem sessão, em cada modo.
Login inválido retornou401; cookies access/refresh HttpOnly presentes somente
na partição da API; sessão do renderer sem cookies e document.cookie vazio.
Backend compilado em53000, PostgreSQL55432/Redis56379, conta ativa sintética
criada somente para o ensaio. Perfis temporários e registros próprios removidos.

Comando: `node services/dashboard/scripts/session-rehearsal.mjs`, após build e
início dos serviços db-test/redis-test do projeto vers-realtime-rehearsal.
Scripts não carregam .env; configuração Vite/Electron agora desativa essa leitura.

O lote prova transporte REST e persistência, sem migrar telas. Socket.IO deve
usar a mesma sessão no main no lote5; o cliente legado do renderer não passa
a compartilhar cookies automaticamente. Renovação automática/expiração na
interface e isolamento de cache entre contas pertencem ao lote2. Instalador
Windows e HTTPS de distribuição não foram validados nesta entrega.

Validação final: 80 arquivos/565 testes unitários aprovados; typecheck e build
main/preload/renderer aprovados. Avisos conhecidos de Canvas no jsdom, sem
falhas. O teste inicial falhou pela ausência do módulo; novos casos de payload
não textual e host incompatível também falharam antes da correção.

Status: lote1 concluído para a demonstração local; próximo lote2.
