<!-- Planeja patches transitivos HTTP e Socket.IO preservando contratos e faixas dos pais. -->
# F09 — Dependências HTTP e Socket.IO

## Escopo — 20/10/2026

NXT autorizado após atualização Joi. Atualizar resoluções transitivas engine.io
6.6.9→6.6.10, proxy-addr2.0.7→2.0.8 e qs6.15.3→6.16.0, dentro das faixas dos
pais Socket.IO/Express/body-parser. Conferir pacote instalado e metadados npm;
não adicionar dependência direta, override ou mudar Express/Nest. Somente
lockfile e documentação previstos, sem nova regra HTTP/CSRF/Origin.

Skill fix-finding mantida com investigação/revisão read-only independentes.
Não comprovada exploração no VERS: proxy-addr depende de trust subnet que não
foi encontrada no src; limites do adaptador e parser devem ser preservados.

## Verificação

Gerar resolução com pnpm em modo lockfile-only e scripts ignorados; inspecionar
diff contra baseline e retirar mudanças colaterais geradas. Conferir aliases
afetados e dependências internas do patch. Instalação congelada sem scripts,
lint, tipos, build e unitários. Audit read-only antes/depois, contando somente
caminhos backend. Não tratar exit global por outros avisos como falha destes
três patches, nem declarar segurança global aprovada.

Após build concluído, avisar antes de Docker, inventariar portas/serviços e
executar suíte bootstrap real (HTTP/sessão, MQTT e aviso Socket.IO) mais os
cenários polling/websocket do ensaio F08 já existente. Apenas bancada sintética
local autorizada, com limpeza por IDs/contadores e parada ao fim, volumes
preservados. Sem .env, Neon, migration, commit/push ou rebuild da imagem de
produção sem necessidade do ensaio. Containers de uso exigirão rebuild depois.

Controles novos em src/app.foundation.spec.ts antes de instalar os patches:
formulário URL-encoded válido versus email aninhado recusado pelo DTO; variar
X-Forwarded-For no ensaio de rate limit sem mudar trust proxy. São regressões de
compatibilidade, não prova de exploit nas versões anteriores. CLI update não
moveu transitivas e re-resolveu snapshots alheios; retirar esses deltas e editar
só resoluções/arestas com hashes consultados no registro. Instalação congelada
deve confirmar consistência, sem overrides nem dependências diretas novas.

## Resultado — 20/10/2026

Outcome: fixed para presença das versões afetadas. Runtime explorável no VERS
não foi demonstrado. Registry consultado: engine.io6.6.10, proxy-addr2.0.8 e
qs6.16.0 cabem nas faixas instaladas; Express5.3.0 existe mas não foi necessário.
Pais preservados: Socket.IO4.8.3 (~6.6.0), Express5.2.1 (^2.0.7/^6.14.0) e
body-parser2.3.0 (^6.15.2). Nenhum manifest, override, configuração ou runtime
de aplicação alterado. Diff de produção contém somente lockfile.

Investigação read-only independente: proxy-addr participa de req.ip usado pelo
throttler, mas sem trust proxy configurado; qs é alcançado pelo parser padrão
URL-encoded extended do Nest, não pelo query parser simples do Express;
Engine.IO recebe tráfego antes da autorização do namespace. Adaptador continua
exigindo Origin permitido, 1024 bytes e transportes polling/websocket.
Revisão read-only independente do candidato não achou bypass/regressão concreta.

### Execução e gates

- pnpm update com nomes/version/depth/lockfile-only terminou zero mas não moveu
  as transitivas; gerou apenas snapshots alheios. Esses deltas foram retirados.
  Lock montado com hashes consultados no registro e referências dos pais:
  Express e body-parser usam qs novo; Socket.IO usa Engine novo. Base64id sai
  só da aresta Engine; permanece no Socket.IO. ws8.21.1/side-channel1.1.1/
  es-define-property1.0.1 existentes satisfazem patches sem atualização extra.
- Baseline dos controles HTTP novos na instalação anterior: foundation 39/39
  passou. pnpm exec tentou autoinstall e abortou por ausência de TTY; execução
  direta do Jest instalado evitou alterar módulos durante a baseline.
- Instalação congelada --ignore-scripts com strictDepBuilds=false e
  confirmModulesPurge=false temporários passou, resolução pulada e integridades
  verificadas. Nenhum script/build novo aprovado nem flag persistida.
- Lint, TypeScript noEmit, build e 46 suítes/964 unitários aprovados. Dois novos
  controles verificam formulário escalar aceito/nested email recusado antes do
  serviço. Throttle real permanece 429 mesmo variando X-Forwarded-For.
- Auditoria read-only posterior: zero avisos dos três pacotes. Backend30→26:
  1 crítico, 15 altos, 9 moderados, 1 baixo. Exit global ainda tem outros avisos;
  não declarar segurança global aprovada. Versões instaladas conferidas pelos
  caminhos efetivamente resolvidos por Express/body-parser/Socket.IO.
- Bancada local inventariada sem outros containers ativos e portas livres;
  certificado público renovado/copiado. Polling e websocket reais: 2/2 em
  15,031 s (cinco casos F08 filtrados). Bootstrap completo: 6/6 em 91,252 s,
  incluindo sessão/SQL audit, MQTT/TLS, criação/ciclo HTTP e recuperação de
  60 s sem novo MQTT. Build já terminado antes de abrir processos de teste.
- SQL final: zero nas 12 tabelas usadas. SCAN auth:login:* vazio. Bancada
  parada, volumes preservados. git diff --check aprovado.

Arquivos alterados: pnpm-lock.yaml, app.foundation.spec.ts e documentação.
Sem nova regra de produto, banco externo, .env, migration, dependências diretas,
commit/push. Sem PoC ofensiva; remoção dos avisos é o substituto focado da
reprodução. Imagem de uso não reconstruída e instalação limpa não comprovada.
F09 segue aberta com 26 avisos e demais pendências operacionais.
