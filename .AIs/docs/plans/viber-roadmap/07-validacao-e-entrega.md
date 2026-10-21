<!-- Define testes, ensaio real, configuração local e critérios de entrega da Viber para a apresentação. -->
# Etapa 7 — validação, operação e entrega

## 1. O que comprovar

A entrega só fica pronta quando a Viber responde no Electron real usando o
backend autenticado, o serviço Python e a OpenAI, com streaming e gasto
controlados. Testes de componentes ou `/health` isolado não comprovam esse fluxo.

Não usar pessoas reais, dados privados de veículos ou telemetria para demonstrar
o chat. A conta ativa já usada na bancada pode autenticar o aplicativo, mas
seu perfil não deve entrar na chamada ao modelo.

## 2. Matriz mínima de testes

| Camada | Casos mínimos | Tipo de prova |
| --- | --- | --- |
| Base | Conhecimento esperado, limites e ausência de fatos inventados. | Revisão documental + corpus manual. |
| Python | Payload, montagem do prompt, deltas, cancelamento, erro do provedor. | Unitários com SDK simulado. |
| Financeiro | Reserva concorrente, reinício, uso incerto, arquivo inválido, teto. | Unitários com diretório temporário. |
| Backend | Sessão, CSRF, DTO, proxy, framing, headers e erro pós-headers. | Unidade + integração com bootstrap. |
| Main/preload | Remetente, UUID, UTF-8, limites, cancelamento e limpeza. | Unidade + Electron real. |
| Renderer | Envio único, texto incremental, pausa, erro, nova conversa e logout. | Componentes/hook. |
| Integrado | Login → pergunta → deltas → término → nova pergunta. | Electron dev e build. |
| Retomada | Reinício da IA mantém gasto/pausa e recusa quando esgotado. | Container real com cenário sintético. |

Novos comportamentos começam com testes que falham pelo motivo correto.
Não chamar a OpenAI na suíte unitária; respostas artificiais de teste não podem
virar fallback silencioso no aplicativo.

## 3. Comandos previstos

Executar somente na implementação, respeitando ambiente sintético e a proibição
de leitura de `.env`. Se uma ferramenta carregar esse arquivo automaticamente,
configurar modo explícito que não o leia antes de executar.

| Local | Comando |
| --- | --- |
| `services/ai-service` | `python -m unittest discover -s tests -v` |
| `services/backend` | `npm run test:unit` |
| `services/backend` | `npm run lint` e `npm run build` |
| `services/dashboard` | `npm run test:unit` |
| `services/dashboard` | `npm run typecheck` e `npm run build` |
| Dashboard, se distribuído como instalador | `npm run build:electron`, seguido de prova real do pacote. |

Os scripts npm acima já existem nos serviços TypeScript. Usar o gerenciador
do workspace quando necessário para dependências, sem trocar lockfile.
Registrar versões reais de Python/Node/Electron/SDK, não presumir que versões
mínimas declaradas são as instaladas.

## 4. Configuração local prevista

1. Confirmar rede da apresentação e acesso à conta de API, sem publicar chave.
2. Manter Electron no host e usar backend/ai-service locais na topologia acordada.
3. Configurar somente nomes documentados em arquivos `.env.example`; segredos
   reais são fornecidos pelo operador ao processo, sem leitura pelo agente.
4. Criar volume persistente do orçamento e inicializar um identificador único
   da apresentação com teto de US$10 menos qualquer consumo anterior aplicável.
5. Rebuildar o ai-service pelo Dockerfile que o Compose realmente usa.
6. Subir/recriar apenas serviços afetados, verificando alterações de configuração
   do backend e preservando banco/Redis e dados da outra frente.
7. Confirmar que a base runtime está na imagem e a versão é a esperada.
8. Conferir que nenhum container de IA recebe DATABASE_URL ou credenciais JWT.
9. Confirmar um worker e que o orçamento foi carregado do volume, não recriado.
10. Fazer uma chamada curta paga e conferir stream/consumo dentro do registro.

Na implementação, acrescentar aqui o comando Docker exato da bancada depois
de verificar sua composição e origem das variáveis. Não publicar comando que
dependa implicitamente de carregar o `.env` proibido. Não apagar volumes como
procedimento de tentativa de correção.

## 5. Roteiro de ensaio funcional

### A — percurso feliz

1. Abrir Electron em desenvolvimento, autenticar e entrar na Viber.
2. Perguntar “O que é o VERS?” e registrar que o primeiro delta chega antes
   do fim, sem gravar credenciais na evidência.
3. Perguntar “Para que servem os sensores?” e verificar resposta sobre funções.
4. Usar uma referência curta à pergunta anterior para provar memória temporária.
5. Ativar fundamentos e perguntar diferença entre potência e energia.
6. Verificar texto curto, exemplo didático e ausência de fontes/anexos fictícios.
7. Confirmar contagem de pausa e retorno do envio.
8. Criar nova conversa e conferir que as mensagens foram descartadas.
9. Repetir o fluxo essencial no Electron abrindo os arquivos do build local.

### B — limites de conhecimento

Usar o corpus do [contexto geral](00-contexto-geral-viber.md), cobrindo:
propósito, piezo, retificação, capacitor, sensores, unidades, eficiência,
assunto externo, dado individual, ação proibida e desconhecimento factual.
Não exigir igualdade literal de texto de um modelo generativo.

Reprovar resposta que invente energia gerada, diagnóstico do carro, esquema
elétrico validado, pinos/componentes aprovados ou economia de combustível.
Se falhar, ajustar base/instruções e repetir somente os casos afetados, dentro
do orçamento de teste. Não aumentar reasoning/modelo automaticamente.

### C — falhas e ciclo de sessão

- Pausar rede: pergunta preservada ou resposta parcial identificada.
- Parar ai-service: núcleo continua utilizável e Viber informa indisponibilidade.
- Clicar enviar repetidamente: só uma geração admitida.
- Cancelar: upstream encerrado e sem segunda geração automática.
- Sair da conta durante resposta: logout não espera pelo stream e a conversa some.
- Entrar com outra conta: nenhum delta ou texto da conta anterior reaparece.
- Reabrir aplicativo: sessão segue regra já aprovada do núcleo; conversa começa vazia.

### D — dinheiro e retomada

Com provedor simulado e valores de orçamento sintéticos:

1. Admitir uma reserva e derrubar o serviço antes do usage final.
2. Reiniciar e provar que a reserva não virou saldo disponível.
3. Esgotar orçamento de teste e provar recusa antes da chamada paga.
4. Reiniciar outra vez e provar que o teto continua esgotado.
5. Simular arquivo corrompido/volume ausente e provar bloqueio seguro.
6. Voltar à configuração real sem restaurar US$10 fictícios; conferir consumo
   efetivo já realizado no projeto de API.

## 6. Evidências a preencher pelo Gabriel

| Campo | Registro após implementação |
| --- | --- |
| Commit/baseline do núcleo | Pendente. |
| Commits da Viber | Pendente; programador executa commits/push. |
| Revisão da base/modelo/configuração | Pendente. |
| Python: testes e resultado | Não executados neste planejamento. |
| Backend: unidade/lint/build | Não executados para esta entrega. |
| Electron: unidade/typecheck/build | Não executados para esta entrega. |
| Ensaio dev e build | Pendente. |
| Instalador Windows | Pendente se fizer parte da entrega física. |
| Consumo antes/depois dos testes | Pendente, dentro de US$10. |
| Retomada/arquivo inválido | Pendente. |
| Latência e tamanho típico | Medir; não estimar como evidência. |
| Parâmetros propostos confirmados/ajustados | Pendente de ensaio. |

## 7. Operação durante o evento

O operador abre o app já testado, confirma conectividade e disponibiliza o
computador. Mostrar orientação breve de que Viber explica o projeto e que não
devem ser enviados dados pessoais. Não distribuir credencial compartilhada aos
visitantes ou abrir a API publicamente para atender o público inteiro.

Ao atingir a trava financeira, encerrar novas gerações e manter as outras telas
do VERS utilizáveis. Não contornar bloqueio reiniciando container ou limpando
volume. O operador pode continuar a explicação humana do projeto.

## 8. Recuperação e rollback

Problema exclusivo da Viber: desativar VIBER_ENABLED e manter o núcleo.
Rollback de código remove as conexões do módulo/ponte da Viber, preservando
commits de medições e autenticação. Não apagar o registro de orçamento.
Rollback da base restaura uma revisão factual conhecida sem resetar gasto.
Rotacionar credencial somente se houver exposição real, sem publicá-la em logs.

Atualizar contexto diário e esta matriz com resultados e pendências reais.
Entrega final sugerida: `test: validar Viber no Electron e registrar apresentação`.
