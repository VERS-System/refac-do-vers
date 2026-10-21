<!-- Define os contratos propostos entre Electron, backend e ai-service para texto incremental da Viber. -->
# Etapa 3 — contratos e streaming

## 1. Princípio

Um contrato pequeno e próprio evita modificar as cinco operações demonstrativas
de `RepositorioVers` durante o lote 4 do núcleo. A nova tela Viber pode usar
um hook específico, injetável para testes. Não mudar tipos globais de medições
para acomodar o chat. Todos os contratos abaixo são novos e propostos.

## 2. Endpoint público

`POST /api/v1/viber/responses`

Exige sessão válida em cookie, Origin permitido, CSRF e JSON. Não usar GET com
pergunta na query: ela apareceria em URLs/logs e permitiria geração por leitura.
O renderer nunca monta esta requisição diretamente; o main é o cliente.

```json
{
  "clientRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Para que serve a ponte retificadora no VERS?",
  "history": [
    { "role": "user", "content": "O que é piezoeletricidade?" },
    { "role": "assistant", "content": "É a produção de carga elétrica por deformação..." }
  ],
  "explain": false
}
```

| Campo | Regra proposta |
| --- | --- |
| `clientRequestId` | UUID por tentativa; correlação, sem identidade pessoal. Não gera replay automático. |
| `message` | String com trim, 1–2.000 caracteres; sem objeto de veículo ou contexto externo. |
| `history` | Zero a seis mensagens, pares completos user/assistant; até 6.000 caracteres no conjunto. |
| `history[].content` | Texto não vazio, limitado individualmente e no conjunto. |
| `explain` | Booleano; padrão false. Solicita fundamentos no texto normal. |

Rejeitar campos extras e papéis privilegiados. Corpo total limitado, por exemplo
32 KiB em bytes, além dos limites semânticos. A contagem final de tokens ocorre
no ai-service depois de adicionar base e instruções. Nunca aceitar `model`,
`max_output_tokens`, `budget`, `basePath`, URL ou chave enviados pelo cliente.

## 3. Endpoint interno

`POST /internal/v1/viber/responses` no ai-service, com o mesmo corpo validado.
O backend acrescenta somente correlação técnica e autenticação entre serviços.
Não encaminha cookies do usuário, CSRF, ID de conta, perfil ou roles.

Proposta: token aleatório configurado nos dois serviços, comparado com função
de comparação segura no Python. Ausência/token incorreto rejeita antes de
contar tokens ou gerar. Não reutilizar segredos JWT para esse token.
Sem CORS permissivo; a rota não é um recurso público do navegador.

## 4. Resposta incremental comum

Após validação e admissão, HTTP 200 com `Content-Type: text/event-stream`,
`Cache-Control: no-store`. Cada evento tem um nome fixo e uma linha `data`
contendo JSON. Sem dependência do formato cru da OpenAI.

```text
event: started
data: {"clientRequestId":"550e8400-e29b-41d4-a716-446655440000","knowledgeVersion":"vers-2026-10-20-v1"}

event: delta
data: {"clientRequestId":"550e8400-e29b-41d4-a716-446655440000","text":"A ponte retificadora "}

event: delta
data: {"clientRequestId":"550e8400-e29b-41d4-a716-446655440000","text":"converte o sinal alternado dos piezos em corrente retificada."}

event: completed
data: {"clientRequestId":"550e8400-e29b-41d4-a716-446655440000","finishReason":"completed","retryAfterSeconds":10}

```

Estados terminais possíveis: `completed` ou `error`. Um término por limite
usa `completed` com `finishReason: "output_limit"` e a interface identifica
resposta interrompida pelo tamanho. Cancelamento local não precisa aguardar um
evento terminal; encerra conexões e descarta novos eventos dessa tentativa.

Exemplo de falha depois de iniciar o stream:

```text
event: error
data: {"clientRequestId":"550e8400-e29b-41d4-a716-446655440000","code":"UPSTREAM_UNAVAILABLE","message":"Não foi possível concluir a resposta.","retryAfterSeconds":10}

```

Esses códigos pertencem ao contrato de stream Viber; não ampliar o enum global
`ApiErrorCode` do núcleo só para adicioná-los. Para erros antes dos headers,
usar os envelopes HTTP existentes do backend e seus códigos suportados.

## 5. Falhas antes dos headers

| Situação | HTTP proposto | Comportamento público |
| --- | --- | --- |
| Payload inválido ou entrada total excessiva | 400 | Pedir pergunta menor/campos válidos; zero geração. |
| Sessão ausente/expirada | 401 | Voltar ao fluxo de autenticação existente. |
| Origin/CSRF inválido | 403 | Operação recusada sem chamada ao ai-service. |
| Geração global ocupada | 429 | Mostrar espera com Retry-After; sem fila de tarefas. |
| Pausa ativa | 429 | Mostrar segundos restantes, sem nova chamada paga. |
| Teto insuficiente | 503 | Informar indisponibilidade para a apresentação; não oferecer retry automático. |
| Base, configuração ou volume inválido | 503 | Recurso indisponível; núcleo continua funcionando. |
| OpenAI/rede indisponível | 503 | Preservar pergunta e permitir nova tentativa manual após pausa. |

Usar mensagens fixas permitidas, sem corpo bruto do provedor ou dados técnicos
de orçamento na UI pública. Ao encaminhar recusa interna, o backend reconstrói
o envelope seguro em vez de repassar JSON arbitrário.

## 6. Contrato IPC proposto

Arquivo próprio: `services/dashboard/src/shared/viber.ts`.
Exposição restrita em `window.vers.viber`:

- `enviar(entrada)`: inicia tentativa e retorna confirmação curta de admissão;
  não espera a geração inteira.
- `cancelar(clientRequestId)`: cancela somente tentativa da janela chamadora.
- `aoEvento(callback)`: recebe a união tipada dos eventos conhecidos e devolve
  função de remoção do listener. Não entrega o objeto IPC original.

Registrar listener antes de enviar. Eventos levam requestId e são enviados
somente para o webContents proprietário. Rejeitar origem/frame não esperado.
Não expor `ipcRenderer`, canais livres, URLs ou headers para o renderer.

`requestId` HTTP identifica a passagem no backend; `clientRequestId` identifica
a tentativa da UI. Não confundir com identidade de usuário ou cursor de retomada.
Depois de desconectar, não há replay de stream nem Last-Event-ID.

## 7. Parser e limites

- Decodificar UTF-8 incrementalmente; caracteres podem atravessar chunks.
- Aceitar separadores de eventos em LF e CRLF.
- Manter fragmento pendente entre chunks; processar todos os eventos completos.
- Limitar evento, buffer pendente e texto acumulado para impedir crescimento.
- Validar JSON e união de eventos, ignorando comentários heartbeat conhecidos.
- Evento desconhecido/malformado encerra com erro seguro; não vira texto do bot.
- EOF sem evento terminal produz erro de interrupção.
- Não juntar toda a resposta antes de atualizar a tela.

## 8. Testes do contrato antes do acoplamento

- [ ] O mesmo fixture de entrada/eventos é compreendido pelas três camadas.
- [ ] Delta dividido no meio de um caractere acentuado e do delimitador SSE.
- [ ] Vários eventos no mesmo chunk; linha CRLF; JSON escapado.
- [ ] Buffer/objeto/role inválido bloqueado.
- [ ] Evento terminal único e evento atrasado ignorado após cancelamento.
- [ ] HTTP de erro não é interpretado como SSE de sucesso.
- [ ] Timeout não reenvia o POST.
- [ ] Autenticação do usuário permanece somente até o backend.

Entrega: contrato revisado e fixtures sintéticas; arquivos de contrato próprios.
Manter referência desta etapa na OpenAPI ao conectar o backend, em um único
commit coordenado, sem reformatar os contratos antigos.
