<!-- Planeja controle financeiro persistente e pausas da Viber dentro do teto total de dez dólares. -->
# Etapa 4 — orçamento, pausas e falhas de cobrança

## 1. Regra de produto e limites da garantia

Orçamento autorizado: **US$10 no total**, incluindo ensaios pagos desta entrega.
Não existe teto de dez perguntas. Pausas regulam a cadência; tokens limitados e
reserva prévia controlam a despesa. Timeout sozinho não limita gasto e uma
requisição cancelada pode já ter consumido tokens.

A trava local cobre **as chamadas feitas por esta instância da Viber**, com
preços verificados e credencial/projeto dedicados. Não controla outros programas
usando a mesma conta, cobranças anteriores ou mudança de tabela de preços.
Antes do evento, conferir saldo e consumo no provedor e reservar para a Viber
somente o valor realmente disponível. Não anunciar garantia sobre a fatura inteira.

## 2. Simulação de custo

Referência consultada em 20/10/2026: GPT-5.5, texto, entrada sem desconto
US$5/milhão e saída US$30/milhão. Fonte: [modelo e preços oficiais](https://developers.openai.com/api/docs/models/gpt-5.5).

Planejar conservadoramente sem assumir cache do provedor. Não implementar
cache próprio de perguntas nesta entrega: o responsável escolheu online com teto.

`custo_USD = tokens_entrada × 5 / 1.000.000 + tokens_saída × 30 / 1.000.000`

| Entrada | Saída | Custo aproximado | Perguntas teóricas com US$10 |
| --- | --- | --- | --- |
| 2.000 tokens | 200 tokens | US$0,016 | 625 |
| 4.000 tokens | 250 tokens | US$0,0275 | 363 |
| 6.000 tokens | 400 tokens | US$0,042 | 238 |
| 12.000 tokens | 400 tokens | US$0,072 | 138 |

São cenários matemáticos, não previsão de duração. Testes pagos, contexto real,
falhas e margem financeira reduzem a quantidade. Não prometer 7.000 conversas.

## 3. Reserva antes de gerar

Proposta com uma instância e um worker do ai-service:

1. Validar credencial interna, payload, prontidão, slot global e pausa.
2. Montar **exatamente** a entrada que será enviada ao modelo, incluindo
   instruções, base, histórico e pergunta; não alterá-la após a contagem.
3. Contar tokens de entrada com o endpoint oficial de contagem, usando o
   mesmo modelo e conteúdo. Se não houver contagem confiável, não gerar.
   Não usar a aproximação “quatro caracteres por token” como trava financeira.
4. Rejeitar entrada acima do teto proposto de 12.000 tokens; não truncar a base
   silenciosamente. Reduzir pares antigos do histórico pela regra documentada
   antes de contar, mantendo a pergunta atual.
5. Calcular reserva pelo total contado de entrada sem desconto + teto inteiro
   de saída + margem técnica documentada, por exemplo US$0,001.
6. Sob trava, verificar `gasto conservador + reservas + nova reserva <= teto`.
7. Gravar reserva no volume **antes** de iniciar chamada de geração.
8. Criar a geração uma única vez com retries automáticos desativados.
9. Com usage final válido, converter reserva em consumo conservador calculado
   com tokens reais. Não somar reasoning_tokens novamente se já integra output_tokens.
10. Só liberar a diferença da reserva após gravar o fechamento com segurança.

O endpoint de contagem é uma chamada de preflight: confirmar seu contrato e
eventuais custos na conta antes de habilitar. Enquanto isso não estiver
verificado, a política não pode ser declarada um teto financeiro completo.
Se o SDK instalado não expuser contagem, usar o endpoint oficial por httpx já
instalado ou atualizar somente a dependência necessária, registrando a versão.

## 4. Aritmética e estado durável

Usar inteiros em milionésimos de dólar, com tarifas conservadoras inteiras
(entrada 5, saída 30 por token) e teto 10.000.000. Não usar float monetário.
O desconto por entrada em cache pode ser ignorado deliberadamente; isso tende
a bloquear antes, não a exceder o teto com os preços definidos.

Registro local proposto: `/var/lib/vers-viber/budget.json`, em volume persistente.
Campos mínimos: versão do formato, identificador da apresentação, modelo,
tarifas usadas, teto, consumo fechado, reservas pendentes e próxima admissão.
Reservas levam somente IDs técnicos e valores; **nenhuma pergunta/resposta**.
Manter também os IDs das tentativas já encerradas durante esta apresentação,
sem seus textos, para recusar reenvio do mesmo UUID após liberar a reserva.
Não oferecer cache/replay de respostas; uma tentativa intencional nova recebe
outro UUID e passa novamente pela pausa e pelo saldo disponível.

Escrever arquivo temporário no mesmo diretório, descarregar/gravar de forma
durável e substituir atomicamente. Validar formato, inteiros, sinal, totais e
versão ao iniciar. Se não puder ler ou gravar com segurança, bloquear gerações.

Primeira inicialização é explícita pelo operador, com saldo confirmado.
Arquivo ausente depois da inicialização, corrompido ou volume perdido não cria
US$10 novos. Não expor reset de orçamento na interface ou em rota pública.
Reiniciar container não zera gasto, reserva ou cooldown.

Limitador conhecido: um processo/worker. Não escalar réplicas ou workers sem
trocar o armazenamento por coordenação transacional compartilhada. Esse limite
deve receber comentário `shortcut:` na implementação, como pedem as regras.

## 5. Cobrança incerta e recuperação

| Evento | Tratamento conservador |
| --- | --- |
| Falha antes de enviar geração, comprovada | Liberar reserva com registro durável. |
| Erro depois de enviar, sem usage | Conservar a reserva inteira como despesa potencial. |
| Usuário cancela depois do envio | Abortar upstream; manter reserva se usage final não estiver disponível. |
| Serviço cai com reserva pendente | Ao iniciar, mantê-la como consumida/potencial, nunca liberar por tempo. |
| Usage supera reserva ou tarifa/modelo diverge | Bloquear novas gerações e exigir reconciliação pelo operador. |
| Falha de gravação ao concluir | Bloquear novas gerações; conservar reserva anterior. |
| Orçamento não comporta próxima reserva | Recusar antes de abrir geração, mesmo se ainda houver alguns centavos. |

Reconciliar valores incertos só com evidência do provedor e operador responsável.
Não criar desbloqueio automático para melhorar disponibilidade no evento.

## 6. Pausa progressiva e limites de rede

Proposta inicial simples: uma geração global por vez e dez segundos de pausa
após seu encerramento. Isso atende o pedido de pausas periódicas sem criar
degraus de penalidade desnecessários. Confirmar valor no ensaio.

1. Ao enviar, desabilitar novo envio e oferecer cancelamento.
2. Durante o stream, atualizar a resposta sem reiniciar prazo de pausa.
3. Ao encerrar, informar a espera restante pelo servidor.
4. Renderizar contagem regressiva acessível; ao zerar, permitir nova tentativa.
5. Nova conversa, troca de conta ou relógio da interface não contornam a regra.
6. Backend mantém proteção HTTP existente contra abuso; não a confundir com
   limite de dez perguntas totais. Evitar polling de alta frequência.

Timeouts de conexão/ociosidade/total encerram falhas; não pausar e retomar a
mesma geração para economizar tokens. O modelo continuaria gerando upstream.

## 7. Testes financeiros obrigatórios

- [ ] Requisição que cabe exatamente é admitida; um milionésimo a mais é negado.
- [ ] Duas admissões concorrentes não reservam o mesmo saldo.
- [ ] Nenhuma chamada OpenAI começa antes da persistência da reserva.
- [ ] Uso real menor fecha reserva e libera somente a diferença calculada.
- [ ] Falta de usage, cancelamento e reinício não devolvem saldo incerto.
- [ ] Arquivo ausente/corrompido/sem permissão bloqueia em vez de resetar.
- [ ] Mesmo UUID não inicia duas gerações; não reproduzir a resposta anterior.
- [ ] Contagem falha ou modelo diferente bloqueia geração.
- [ ] Pausa e teto são impostos no servidor, mesmo ignorando a UI.
- [ ] Reinício com orçamento esgotado continua bloqueado.

## 8. Aceite e entrega

Entregar testes sem chamadas reais, registro agregado em volume e ensaio de
reinício. Depois, realizar poucas chamadas pagas dentro do mesmo teto.
Guardar somente metadados de custo e estado, sem conteúdo das conversas.

Commit sugerido: `feat: limitar custo da Viber com reserva persistente`.
Esta etapa é necessária antes de expor o serviço ao computador da apresentação.

## 9. Decisões de implementação (20/10/2026)

Registradas com o programador antes do Lote B3:

- **Divisão em dois lotes**: B3a = módulo de orçamento (armazenamento
  durável, aritmética em milionésimos, reservas, CLI de inicialização),
  testado sem tocar a rota; B3b = integração na rota SSE (reserva antes
  de gerar, uso final no evento `completed`, pausa 10s, prazos 45s/20s).
- **Inicialização**: CLI local do serviço
  (`python -m src.orcamento_cli init|status`), sem rota HTTP pública e
  sem comando de reset — segunda inicialização falha se o arquivo já
  existir.
- **Caminho**: env `VIBER_BUDGET_PATH`, default
  `/var/lib/vers-viber/budget.json`; testes usam diretório temporário;
  volume dedicado no compose fica no B3b.
- **Contagem de tokens de entrada**: endpoint oficial da OpenAI chamado
  pelo próprio cliente (`max_retries=0`), isolado em função testável com
  mock; falha de contagem bloqueia a geração (503). Verificação com
  chamada real (custo mínimo) fica a cargo do programador antes de
  declarar o teto ativo em produção.
- **Mapeamento HTTP adicionado ao contrato da etapa 3**: pausa ativa =
  429 + `Retry-After`; saldo insuficiente/teto = 503; UUID de tentativa
  já encerrada = 409 (novo status, registrado aqui e no backend antes do
  lote 5); qualquer bloqueio interno de orçamento = 503.
- **Aritmética**: inteiros em milionésimos de dólar; entrada 5, saída 30
  por token; margem técnica 1.000 (US$0,001); teto padrão 10.000.000.
  Reserva = entrada × 5 + 400 × 30 + margem.

## 10. Tarifas do provedor Gemini (20/10/2026)

A migração de provedor decidida no plano `09-migracao-gemini.md` altera
apenas as tarifas desta página: entrada **1**, saída **3** micros por token
(preço real US$0,50/US$3,00 por milhão; 0,5 arredondado para cima por ser
não inteiro). Margem, teto, reserva (2.300 micros por geração padrão) e
mapeamento HTTP do §9 seguem inalterados.
