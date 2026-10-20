<!-- Inventaria os 37 metodos do desktop e delimita sua correspondencia com a API atual. -->
# Electron/backend — lote 0: matriz de contratos

> Atualização do lote4: autenticação, cadastro, testes/transições, resumos TEST,
> comparação e telemetria agora têm adaptadores reais na AplicacaoConectada.
> Energia geral por instalação, curvas sem contrato, suporte e Viber continuam
> pendentes ou em demonstração identificada. As tabelas abaixo preservam o
> inventário original; estado de execução no [plano do lote4](desktop-backend-medicoes-lot4.md).

## Escopo e decisões

Continuidade NXT após fechamento da F09 local. Este lote é documental: conferir
interface, hooks, consumidores, contratos e controllers registrados antes de
implementar transporte ou trocar mocks. Arquivos previstos: esta matriz,
plano de integração e contexto diário. Sem alterar código, API ou shared-types.

Decisões explícitas do programador nesta sessão:

- Primeira integração com **API local da demonstração**.
- Recursos sem contrato ficam em **área de demonstração identificada**.
  Isso não autoriza fallback silencioso a fixtures quando a API falhar, nem
  mostrar números de demonstração como se pertencessem ao veículo real.

Contagem conferida por AST TypeScript: **37 métodos**, todos nas tabelas abaixo.
Nenhum está integrado hoje: App cria criarRepositorioMock por padrão. Os hooks
e o provider existentes serão reutilizados. Coluna de consumidor aponta uso
direto do hook ou método; componentes que compõem essas peças herdam o uso.
As tabelas não afirmam que uma importação de hook composto executa todas as
suas mutações: criar/atualizar/remover foram conferidos nos pontos de chamada.

Referências inspecionadas:

- [RepositorioVers](../../../services/dashboard/src/renderer/data/repositorio.tsx),
  [modelos de tela](../../../services/dashboard/src/renderer/data/tipos.ts),
  [hooks](../../../services/dashboard/src/renderer/hooks/useDados.ts).
- [Shared types](../../../packages/shared-types/src/index.ts),
  [OpenAPI](../Api/openapi.yaml), controllers/DTOs/services de auth/users/
  vehicles/installations/tests/data/support e [AppModule](../../../services/backend/src/app.module.ts).
- Main/preload/CSP/Vite, cliente HTTP e cliente Socket.IO legado. Módulos
  boilerplate ai/roles encontrados em disco não estão registrados no AppModule;
  não constituem endpoints disponíveis para preencher as lacunas.

## Regras transversais do adaptador futuro

Todas as rotas abaixo são relativas a `/api/v1`. `R(T)` significa
`{data:T,requestId}`; `P(T)` significa `{data:T[],meta:{page,pageSize,totalItems,
totalPages},requestId}`. Converter página de tela para `{itens,total,pagina,
tamanhoPagina}`, sem descartar páginas silenciosamente nos métodos que retornam
array completo. Padrão20 itens, limite100, página inicial1.202/204 não têm corpo.

Domínio exige sessão ativa em cookies HttpOnly; ler perfil/recursos não exige
CSRF, mas mutações exigem Origin autorizado, cookie nonce e X-CSRF-Token obtido
em GET auth/csrf. Não enviar userId/roles como autoridade. Veículo/instalação
exigem vínculo atual inclusive ADMIN; testes também permitem criador histórico;
suporte pertence ao solicitante. Ausente e alheio usam404 indistinguível.

Unidades: Wh→mWh, W→mW e A→mA multiplicam por1000; V e m/s² permanecem.
Preservar null (não substituir por zero). Dinheiro/tarifa vêm como string
decimal ou null; não criar medida financeira ausente por arredondamento.
Enums exigem mapa explícito entre inglês/maiúsculas e português, não lowerCase.

**UTC é incompatibilidade comprovada:** os DTOs exigem ISO UTC com `Z`, com
milissegundos opcionais. Tela e mock usam datas com `-03:00`. Transformar filtros
para instantes UTC antes do envio; apresentar no fuso escolhido. Filtros reais
usam início inclusivo e fim **exclusivo**; comentários da tela ainda dizem
inclusivo. Não copiar esse comentário como contrato. `periodFrom/To` filtram
periodStart, não a interseção completa de um resumo com a janela.

Cache atual usa chaves sem conta e, em energia, sem veículo/instalação. Antes
de dados reais, limpar no logout/troca de conta e incluir contexto de recurso.
Sem auto-retry de mutações após timeout; não repetir cadastro/start/finish por
causa de resposta ambígua. Tratar400/401/403/404/409/429/503 sem corpo bruto.

## Conta — 5 métodos

| Método | Hook e consumidor direto | Contrato real e adaptação |
| --- | --- | --- |
| `entrar` | useAcoesAutenticacao; pages/LoginPage | POST auth/login, LoginDto/LoginRequest: email e password←senha;200 R(AuthResponse), perfil em data.user. Não recebe JWT no corpo. Sessão só para ACTIVE;401 genérico. |
| `registrar` | useAcoesAutenticacao; pages/CriarContaPage | POST auth/register, RegisterDto/RegisterRequest: email/password/displayName←nome;202 vazio inclusive duplicata. Não autentica nem ativa conta. Fluxo posterior da tela precisa respeitar isso. |
| `obterUsuarioAtual` | useUsuarioAtual; AppShell, ConfiguracoesPage | GET users/me;200 R(UserProfile). displayName/avatarUrl podem ser null; nome e função obrigatórios da tela exigem regra explícita de apresentação, sem fabricar papel ADMIN. emailVerificado←emailVerifiedAt != null. |
| `atualizarPerfil` | useAcoesPerfil; ConfiguracoesPage | PATCH users/me, UpdateProfileDto/UpdateUserProfileRequest: displayName←nome, avatarUrl←foto;200 R(UserProfile). Omitido preserva, null limpa. Avatar é URI, sem endpoint de upload; validar também CSP antes de mostrar URL externa. |
| `encerrarSessoes` | useAcoesPerfil; components/configuracoes/Secoes | POST auth/logout-all, corpo vazio;204. Limpar cache, recursos e socket após revogação confirmada. Hook atual só muda navegação; ainda não isola dados reais entre contas. |

Além desses métodos, transporte precisará GET auth/csrf, POST auth/refresh204
e POST auth/logout204 (sessão individual), hoje ausentes do RepositorioVers.
Não expor cookies/tokens para completar a interface. Refresh concorrente deve
ser único; persistência da sessão ao fechar o app ainda depende de decisão.
Conta nova permanece pendente: não há ativação/email operacional no núcleo.

## Veículo, instalação e suporte — 9 métodos

| Método | Hook e consumidor direto | Contrato real e adaptação/lacuna |
| --- | --- | --- |
| `obterVeiculoAtivo` | useVeiculoAtivo; VisaoGeralPage, EnergiaPage, viber/PainelLateral | GET vehicles;200 P(Vehicle), selecionar isPrimary respeitando todas as páginas. Sem principal/sem veículo deve ser estado explícito; retorno atual não aceita null. Não selecionar o primeiro registro por conveniência. |
| `obterVeiculos` | useVeiculos; busca/BuscaGlobal, veiculos/ListaVeiculos/PainelDetalhes, veiculo/CardsVeiculo/CardsSistema/CardInstalacao, VeiculosPage | GET vehicles;200 P(Vehicle), array da interface exige paginação completa ou evolução explícita de contrato. Mapear licensePlate/brand/model/modelYear/relationship/isPrimary e datas; descritivos são null. |
| `criarVeiculo` | useAcoesVeiculo.criar; PrimeiroVeiculoPage, veiculo/Dialogos, veiculos/FormularioVeiculo | POST vehicles;201 R(Vehicle), CreateVehicleDto/CreateVehicleRequest. licensePlate←placa, brand/model/modelYear opcionais **sem null no cadastro**; NovoVeiculo permite null e precisa omitir esses campos. Placa normalizada no servidor; duplicata409. |
| `atualizarVeiculo` | useAcoesVeiculo.atualizar; veiculo/Dialogos, veiculos/FormularioVeiculo | PATCH vehicles/:id;200 R(Vehicle), UpdateVehicleDto/UpdateVehicleRequest; brand/model/modelYear aceitam null, isPrimary←principal. Placa não muda. Promoção de principal usa regra transacional existente. |
| `removerVeiculo` | useAcoesVeiculo.remover; veiculos/PainelDetalhes | DELETE vehicles/:id?replacementVehicleId=UUID;204. substitutoId vai na query. Exclui vínculo conforme regra do serviço; não presumir exclusão física de todo histórico. Erro/conflito não pode sumir da tela. |
| `obterInstalacao` | useInstalacao; veiculo/CardInstalacao/CardsSistema/CardsVeiculo, veiculos/PainelDetalhes | GET installations?vehicleId=UUID[&status=...];200 P(Installation), ou GET installations/:id após selecionar. Empty→null;404/erro não é empty. Pode haver várias: escolha de instalação precisa ser explícita. activeDevice/installedAt podem ser null. |
| `obterConfiguracoes` | useConfiguracoes; veiculo/CardInstalacao | GET installations/:id/configurations;200 P(Configuration), versões descendentes. Topologia de tela exige piezosTotal/piezosInativos, ausentes do contrato; parte fica demonstração identificada. activePiezoCount/piezoAssociation/installationPoint/storageType/notes/version existem. |
| `obterRevisoes` | useRevisoes; veiculo/CardsSistema | GET support-requests[?status=...];200 P(SupportRequest), só próprias, datas descendentes. Array precisa todas as páginas. vehicleId/installationId podem ser null; estados têm mapa OPEN/IN_REVIEW/SCHEDULED/RESOLVED/CANCELLED. |
| `obterLogsDispositivo` | useLogsDispositivo; veiculo/CardsSistema | Sem rota no core registrado. Linhas de log permanecem somente na área de demonstração; não reutilizar logs internos/auditoria como se fossem logs públicos do dispositivo. |

O backend oferece POST support-requests201/CreateSupportRequest e detalhe GET,
mas não existe método correspondente de criação na interface inventariada.
Não converter automaticamente botões de revisão em mutações fora do contrato
do repositório. Instalações/configurações são somente leitura na API atual;
criação/provisionamento continuam preparação autorizada da bancada.

PublicDevice contém id/name/firmwareVersion/status/lastSeenAt. O modelo de tela
exige plataforma/protocolo/online/ultimoContato obrigatório; os dois primeiros
não estão nessa resposta e lastSeenAt pode ser null. Não preencher ESP32/MQTT
como se fossem campos lidos do backend só porque aparecem no mock.

## Testes e telemetria — 8 métodos

| Método | Hook e consumidor direto | Contrato real e adaptação/lacuna |
| --- | --- | --- |
| `buscarTestes` | useTestes; busca/BuscaGlobal, notificacoes/Notificacoes, testes/PainelTesteAtivo/TabelaHistorico, viber/PainelLateral, TelemetriaPage | GET tests;200 P(TestRecord), TestQueryDto/TestSearchQuery: page/pageSize/status/installationId/startedFrom/startedTo. Consulta atual não tem installationId: definir recurso e cache antes de integrar. Snapshot fornece local/modelo/piezos/versão; não existe codigo curto sequencial #023. |
| `obterResumoTeste` | useResumoTeste; testes/TabelaHistorico | GET tests/:id/energy-summaries?periodType=TEST;200 P(EnergySummary), vazio→null,404 não é null. Seleção deve respeitar período/qualidade; consulta geral pode incluir INVALID, diferentemente da comparação. Converter Wh/W para mWh/mW, sampleCount e qualidade; não recalcular energia. |
| `compararTestes` | useComparacaoTestes; testes/ComparacaoTestes | GET test-comparisons?testIds=ID1&testIds=ID2, repetidos **sem colchetes/CSV**,2–5 UUIDv4 distintos;200 R(TestComparison), itens em data.items. Preserva ordem; resumo ausente/INVALID→null, teste alheio→404 para pedido completo. |
| `criarTeste` | useAcoesTeste.criar; testes/Dialogos | POST tests;201 R(TestRecord), CreateTestDto/CreateTestRequest. NovoTeste não possui installationId/configurationId obrigatórios; selecionar contexto/configuração real antes do envio. name/terrain/testLocation/vehicleWeightKg/notes mapeáveis. Sem status/snapshot/horário enviados pelo cliente. |
| `iniciarTeste` | useAcoesTeste.iniciar; testes/Dialogos | POST tests/:id/start, corpo vazio;200 R(TestRecord). Servidor define startedAt e estado;409 em transição inválida. Atualizar consultas após confirmação. |
| `finalizarTeste` | useAcoesTeste.finalizar; testes/Dialogos | POST tests/:id/finish;200 R(TestRecord), FinishTestDto/FinishTestRequest. COMPLETED/FAILED, outcome e medições do operador com nomes ingleses; horários são do servidor. Resumo pode surgir depois por recuperação, não instantaneamente. |
| `cancelarTeste` | useAcoesTeste.cancelar; testes/Dialogos | POST tests/:id/cancel;200 R(TestRecord), reason←motivo, opcional até500 caracteres. Tratar409 sem antecipar cancelamento na tela. |
| `obterAmostrasTelemetria` | useAmostrasTelemetria; TelemetriaPage, testes/PainelTesteAtivo/TabelaHistorico, viber/PainelLateral; chamada direta data/consultasTelemetria | GET tests/:id/telemetry;200 P(TelemetrySample), page/pageSize/quality/capturedFrom/capturedTo. Ordem capturedAt asc,id asc. testId pode ser null no tipo público, piezosTotal não existe. Converter A/W/Wh e preservar nulos. Última página do teste não equivale automaticamente a janela ao vivo. |

`buscarTodasAmostras` já pagina em100 preservando filtros e para em página
vazia/total atingido. Não tem teto total explícito, cancelamento ou snapshot
entre páginas; definir limite no lote de exportação antes de usar séries grandes.
Não usar exportação como substituto de API de agregação para todas as telas.
`get startedFrom` e capturas são inclusivos no início/exclusivos no fim.

## Energia e medições — 8 métodos

| Método | Hook e consumidor direto | Base existente e lacuna |
| --- | --- | --- |
| `obterResumoEnergia` | useResumoEnergia; energia/KpisEnergia/CardPerdas/CardEconomia/useEnergiaDoPeriodo, visao-geral/KpisAoVivo, notificacoes/Notificacoes, viber/PainelLateral | GET installations/:id/energy-summaries pode fornecer energia/potência/qualidade. Não existe ResumoEnergia completo: faltam quatro pontos, perdas, horasMovimento, diasComLacunas e comparação pronta. Não somar TEST/HOUR/DAY/MONTH sobrepostos nem média de médias. |
| `obterDias` | useDiasDoPeriodo; energia/TabelaResumoDias/useEnergiaDoPeriodo | Mesma rota, periodType=DAY e janela UTC;200 P(EnergySummary). Falta energia p1–p4/horasMovimento/lacunasPercentual do ResumoDia. Uso parcial só com adaptação visual clara; detalhe ausente fica demonstração identificada. |
| `obterCurvaDoDia` | useCurvaDoDia; energia/useEnergiaDoPeriodo | Sem curva de potência por minuto para instalação inteira no core. Telemetria é por teste e não garante grade/consumoNoMw. Não preencher por interpolação silenciosa. Demonstração identificada. |
| `obterAmostrasVibracao` | useAmostrasVibracao; energia/CardEnergiaVibracao | GET tests/:id/telemetry tem vibrationRmsMs2/powerW, ambos null possíveis. Interface recebe só período global, sem testId e retorna números obrigatórios. Contexto/amostras/ausências precisam decisão de apresentação; dispersão global atual não é endpoint pronto. |
| `obterTensaoBateria` | useTensaoBateria; energia/CardEstadoBateria | Não há série de tensão/carga da bateria no contrato. voltageV da telemetria é outra grandeza, não comprova tensão da bateria nem estado de carga. Demonstração identificada. |
| `obterCadeiaAoVivo` | useCadeiaAoVivo; visao-geral/CadeiaConversao/KpisAoVivo, viber/PainelLateral | API não retorna quatro pontos V/A/W, eficiências entre estágios ou energia destinada à bateria/celular. Não derivar da medição única por constantes. Demonstração identificada. |
| `obterBateria` | useBateria; energia/CardEstadoBateria, testes/PainelTesteAtivo, veiculo/CardInstalacao, visao-geral/KpisAoVivo, viber/PainelLateral | Sem química/capacidade/SOC/ciclos/temperatura/estado de carga persistidos na resposta pública. Demonstração identificada. |
| `obterVibracao` | useVibracao; visao-geral/CardVibracao, energia/CardEnergiaVibracao, notificacoes/Notificacoes | Telemetria contém eixos/RMS/piezos ativos/temperatura da amostra. Não contém frequência dominante, faixa pronta, piezosTotal ou temperatura de bloco garantida. Modelo completo fica demonstração até separar campos medidos e ausentes. |

Backend oferece HOUR/DAY/MONTH/TEST, sem WEEK. Tela usa última semana completa;
definir fuso e início/fim da semana antes de compor dias. Hora é janela móvel
na tela; buckets HOUR não garantem esse recorte exato. Não atribuir semana à
soma de meses ou incluir buckets parcialmente cobertos sem regra.

CardEconomia já calcula **estimativa** local por tarifa da preferência e energia
recuperada, com premissa registrada; não equivale ao moneySaved oficial do
resumo (decimal/string, pode ser null). Não misturar origens ou apresentar ritmo
anual como medição. A decisão sobre campos ausentes não altera essa distinção.

## Dispositivo e relógio — 2 métodos

| Método | Hook e consumidor direto | Contrato e limite |
| --- | --- | --- |
| `obterDispositivo` | useDispositivo; AppShell, configuracoes/Secoes; chamada direta notificacoes/Notificacoes | Resolver Installation.activeDevice do recurso escolhido;200 R/P(Installation). PublicDevice não satisfaz o modelo completo (plataforma/protocolo ausentes e contato/firmware nulos possíveis). Nunca usar dispositivo de outro veículo para preencher sidebar; parte não contratada fica demonstração identificada. |
| `agora` | useDispositivo; TestesPage, TelemetriaPage, veiculo/CardsSistema, notificacoes/Notificacoes, viber/PainelLateral | Função local Date, sem endpoint obrigatório. Relógio de apresentação não define horários de start/finish (servidor). Mock mantém relógio fixo só no modo de demonstração; não usá-lo nos filtros reais. |

## Viber — 5 métodos

| Método | Hook e consumidor direto | Estado |
| --- | --- | --- |
| `obterContextosViber` | useContextosViber; ViberIaPage | Sem endpoint core registrado; demonstração identificada. |
| `obterConversasViber` | useConversasViber; ViberIaPage, viber/PainelLateral | Sem endpoint core registrado; demonstração identificada. |
| `obterMensagensViber` | useMensagensViber; viber/PainelConversa | Sem endpoint core registrado; demonstração identificada. |
| `criarConversaViber` | useAcoesViber.nova; ViberIaPage | Sem endpoint core registrado; mutação somente em área demonstrativa explícita. |
| `enviarMensagemViber` | useAcoesViber.enviar; viber/PainelConversa | Sem endpoint core registrado; não enviar conteúdo/dados de conta real ao ai-service por inferência de URL. Integração IA exige contrato próprio. |

## Bloqueios de transporte para o lote 1

api.ts usa `/api/v1`, proxy Vite local e withCredentials; nenhum consumidor
real foi localizado no renderer atual. Empacotado via loadFile, URL relativa
aponta a arquivo local. Main/preload não oferecem transporte HTTP hoje.
CSP só permite localhost3000; não presumir equivalência com127.0.0.1 ou outra
porta. Arquivo mqtt.ts é cliente Socket.IO legado sem consumidor localizado,
com auth.token/evento telemetry/namespace raiz incompatíveis com o contrato
atual `/realtime` por cookie/data.updated/subscribe ACK.

Antes de adotar qualquer transporte: provar sessão no Electron de dev e build
local real. Não liberar Origin null, webSecurityfalse, CORS* ou IPC de URL/headers
arbitrários. Os testes JSDOM não cobrem cookies SameSite/file://. Build/teste
Vite deve impedir carregamento automático de .env, como exigido pelo plano.

## Aceite do lote 0 e próximas decisões

37/37 métodos inventariados; contratos de sessão, paginação, autorização,
unidades, UTC e nulos identificados. Nenhum endpoint/métrica inventado, nenhuma
troca de mock realizada. As lacunas permanecem demonstração identificada por
decisão explícita; falha da API real continua erro, nunca fallback de dados.

Antes de implementar os lotes dependentes, ainda confirmar:

1. Persistência da sessão ao fechar/reabrir Electron.
2. Conta sintética ativa e provisionamento para a prova de transporte (sem
   implementar ativação fictícia), no alvo local isolado.
3. Seleção de instalação/configuração quando há múltiplas ou nenhuma e estado
   sem veículo principal; a assinatura atual não resolve essas escolhas.
4. Fuso/semana e identificação visual de código de teste ausente.
5. Como distinguir visualmente dados reais e demonstração em painéis compostos;
   a autorização para demonstração identificada não define esse desenho sozinha.

Este lote não testa transporte Electron, não constrói pacote, não acessa API,
Docker ou banco e não lê .env. Próximo lote é a prova de sessão, antes de
qualquer adoção do repositório HTTP pelas telas.
