<!-- Planeja a autenticação real da interface com dados de domínio ainda demonstrativos. -->
# Lote2 — autenticação da interface

Autorização NXT em20/10/2026. Reutilizar App, formulários e hooks; entrada real
em main.tsx usa AplicacaoConectada, sem fallback de autenticação para mocks.
App com repositório injetado permanece disponível aos testes existentes.

Ampliar a ponte com cadastro202, perfil PATCH e logout-all204, sempre operações
fixas e payload validado. Perfil401 tenta um refresh e repete somente leitura;
mutações protegidas verificam sessão antes e não são repetidas. Fila do main
compartilha a sessão entre chamadas concorrentes sem rotação dupla.

Criar adaptador de autenticação que converte UserProfile/erros para os modelos
existentes. Repositório explicitamente misto: autenticação real, demais métodos
de demonstração até lotes3–5, com aviso global nas áreas internas. Nada de
fallback para exemplos após erro real. Foto blob local não pode ser persistida
como avatar remoto: recusar com mensagem clara até existir upload.

Consultar perfil na abertura; separar carregando, anônimo, autenticado e API
indisponível com nova tentativa. Proteger rotas privadas e primeiro veículo.
Remontar App e seu QueryClient ao mudar identidade, cancelando consultas no
desmonte; novo repositório demo por conta. Logout confirmado pelo servidor,
erro mantém a sessão visível. Cadastro não autentica nem promete email enviado.

Arquivos: main/sessao e testes, shared/sessao, preload; novo adaptador e
AplicacaoConectada com testes; App/main, AppShell, SecaoSessoes e cadastro;
scripts de ensaio e documentos. Sem mudança de backend, dependências ou deploy.

TDD: escrever testes de contrato antes da ampliação, adaptador/estados antes da
implementação. Verificar renovação única, 401/403/409/422/429/503/rede, sem replay,
cadastro202, perfil, logout-all, troca de conta/cache. Rodar test:unit e build.
Ampliar ensaio Electron real dev/build para cadastro, perfil e duas contas.

## Implementação e evidências

Entrada real main.tsx monta AplicacaoConectada. Ela consulta perfil antes de
mostrar rotas privadas, diferencia indisponibilidade de ausência de sessão e
permite repetir consulta. Ao retornar foco, verifica revogação/expiração.
401 após renovação limitada remove a identidade e avisa no login; falhas de
rede não viram conta de exemplo. App sem autenticação continua somente como
infraestrutura dos testes de UI; o executável sempre injeta autenticação real.

Adaptador data/autenticacao.ts traduz credenciais, cadastro e UserProfile para
os modelos existentes, com erros públicos por status e sem expor corpo bruto.
Ponte adicionou registrar, atualizarPerfil e sairDeTodas. Cadastro exige202,
logout/refresh/logout-all204; perfil exige resposta válida. Antes de PATCH e
logout-all, consulta acesso renovável; não repete a mutação em401 ou timeout.
As leituras concorrentes são serializadas no main e compartilham o refresh.

Troca de identidade remonta App/repositório/cache, cancela consultas antigas
e limpa o destino de busca. Preferências do aparelho permanecem locais, como
antes. Não há socket ativo no renderer atual; compartilhamento/desconexão do
cliente de tempo real será feito no lote5. Não se armazena JWT em JavaScript.

Autenticação e perfil reais; áreas de domínio permanecem explicitamente em
demonstração com aviso no shell. Primeiro veículo é adiado na entrada real
até o lote3, preservando o rascunho local; não confirma criação fictícia de
veículo. Foto local desabilitada porque não existe upload; nome é editável.
Cadastro informa recebimento/ativação pendente, sem prometer envio de email.
Conta ativa para uso pessoal na API3000 continua dependendo do responsável;
nenhum usuário foi criado nessa API ou no banco associado a ela.

Ensaio scripts/session-rehearsal.mjs ampliado: backend real compilado em53000,
DB55432/Redis56379, duas contas ativas exclusivas e dois cadastros pendentes.
Electron dev5175 e build/loadFile passaram seis processos: login pelo formulário,
edição de nome pela tela, reabertura, remoção do access cookie simulando sua
expiração, duas leituras com um refresh, logout-all pelo diálogo, entrada da
segunda conta sem perfil da anterior e logout pelo botão. Banco confirmou
cadastros PENDING_VERIFICATION e zero sessões não revogadas das contas do teste.
Cookies da API permaneceram HttpOnly e separados da sessão do renderer.

O ensaio agora usa cache Vite em seu diretório temporário: execução paralela
com Vitest revelou colisão de otimização/importação de react/jsx-runtime.
Perfis, cache e somente contas/auditoria/chaves Redis geradas são removidos.
Sem dependência nova, modificação de backend ou .env, deploy, commit/push.

Validação final: suíte completa de82 arquivos/588 testes aprovada na repetição,
typecheck e build dos três alvos aprovados. Seis cenários reais repetidos com
o build final e cache isolado, incluindo foto desabilitada. Avisos conhecidos
de Canvas/jsdom e nota de tamanho do Babel no cache do ensaio, sem falhas.

Status: lote2 concluído no escopo da demonstração local; próximo lote3.
