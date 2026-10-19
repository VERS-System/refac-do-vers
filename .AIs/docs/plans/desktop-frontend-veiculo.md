<!-- Plano da tela Veículo e instalação do app desktop (Fase 4 do roadmap do frontend desktop), escrito antes da implementação. -->

# Plano — Tela Veículo e instalação (desktop)

Parte da Fase 4 do [roadmap do frontend desktop](desktop-frontend-roadmap.md).
Referência visual: `services/dashboard/design-reference/05-veiculo-instalacao`.
Alinhado às tasks da equipe [D07 — Sistema VERS](desktop-roadmap/07-telas-sistema-vers.md),
[D09 — Perfil e veículos](desktop-roadmap/09-telas-perfil-veiculos.md) e
[D10 — Suporte](desktop-roadmap/10-telas-suporte.md), e aos contratos
`Vehicle`, `Installation`, `Configuration`, `PublicDevice` e `SupportRequest`
(`packages/shared-types/src/`).

## 1. Decisão do usuário (14/10/2026)

Cadastro funciona no exemplo (em memória, com confirmação): editar o
veículo, adicionar veículo e trocar o veículo principal. Ações no hardware
(reiniciar o terminal, mudar a associação dos piezos) e "Solicitar revisão"
ficam desativadas com "disponível com a API". "Ver logs" mostra um log de
exemplo, só de leitura.

## 2. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| Veículo | km, peso, "Civic e:HEV Touring" | placa, fabricante, modelo, ano, relação, principal | campos do `Vehicle` (peso é do teste) |
| Outros veículos | "Utilitário", "Inativo" | relação e "Sem instalação" | sem categoria no contrato |
| Topologia | dimensões, sensor PZT-5H, taxa 200 Hz, potência por eixo (172/59 mW) | posições dos 8 piezos e os ativos | sem esses dados; a soma por eixo não fechava com os 212 mW ao vivo |
| Armazenamento | Li-Po 1200 mAh | Li-ion 3,7 V · 2200 mAh | decisão de 13/10 (bateria da Energia) |
| ESP32 | MAC, "Atualizado", −58 dBm | id, firmware, status, último contato, protocolo | `PublicDevice` não tem; MAC não vai ao renderer (D07) |
| Revisões | técnico, OS, "resolvida em 15/08", próxima inspeção | motivo, status e datas | `SupportRequest`; 15/08 era antes da instalação (12/09) |

## 3. Dados de exemplo

- Veículos: Honda Civic 2026 · ABC1D23 (principal, proprietário) e Fiat
  Strada 2024 · DEF4G56 (motorista, sem instalação).
- Instalação VERS-PZ01 no Civic, ativa desde 12/09/2026, com o ESP32
  VERS-01.
- Configurações: v1 (12/09, 8 piezos, série), v2 (20/09, 8 piezos,
  paralelo, após recalibrar o LTC3588) e v3 (02/10, 6 piezos, paralelo,
  ativa), depois da falha de fixação do teste #017. Os testes de antes da v3
  passam a registrar v2 e 8 piezos.
- Piezos inativos na v3: 6 (ruído) e 8 (par simétrico).
- Revisões: recalibração do LTC3588 (resolvida, 20/09), refixação do piezo
  7 (resolvida, 02/10) e ruído no piezo 6 (agendada, aberta em 03/10).
- Log do ESP32: eventos de hoje até 18:05 (conexão MQTT, início dos testes
  #022 e #023, amostras, aviso de piezo inativo).

## 4. Contrato do repositório

- `obterVeiculos()`, `criarVeiculo`, `atualizarVeiculo` (fabricante, modelo,
  ano, principal; a placa não muda); placa repetida é `conflito`.
- `obterVeiculoAtivo()` passa a devolver o principal atual.
- `obterInstalacao(veiculoId)` → instalação com o dispositivo, ou `null`.
- `obterConfiguracoes(instalacaoId)` → versões, da mais nova à mais antiga.
- `obterRevisoes()` e `obterLogsDispositivo(dispositivoId)`.

## 5. Tela

Três colunas: veículo (e outros veículos), instalação (topologia, circuito,
associação, armazenamento, ponto de instalação e versões) e dispositivo
(com revisões abaixo). Diálogos: editar veículo, adicionar veículo, tornar
principal e logs. Estados: carregando, erro, "Nenhuma instalação neste
veículo" e "Nenhuma revisão".

## 6. Validação

TDD, `npm run test:unit`, `npm run build`, prints em 1280 e 1512 px. Sem
commit (regra 7).

## 7. Execução (madrugada de 14/10/2026)

Implementado conforme o plano, aguardando revisão e commit do programador.

- TDD: 24 testes falharam pelo motivo certo com esboços; depois 53 arquivos
  de teste e 383 testes passando, sem avisos; build OK.
- Cadastro em memória isolado em `data/cadastroEmMemoria.ts`; o tipo
  `Veiculo` passou a seguir o contrato (campos opcionais, relação,
  principal); `descreverVeiculo` trata os opcionais e há `nomearVeiculo` e
  `normalizarPlaca`.
- Componentes em `components/veiculo/` (`rotulos.ts`, `TopologiaPiezos.tsx`,
  `CardsVeiculo.tsx`, `CardInstalacao.tsx`, `CardsSistema.tsx`,
  `Dialogos.tsx`).
- Ajustes da conferência visual (1280 px): botão "Tornar principal" abaixo
  dos dados do veículo, associação e armazenamento empilhados abaixo de
  1440 px, botões do dispositivo empilhados.
- Formatação: os arquivos do frontend desktop passaram pelo Prettier do
  repositório (`.prettierrc`), que não tinha sido aplicado até aqui.
- Desvio de TDD registrado: o teste de `TopologiaPiezos` foi escrito logo
  depois do componente, não antes.

## 8. A validar pelo programador

- Trocar o principal muda o veículo dos subtítulos, mas as medições de
  exemplo continuam as da instalação do Civic.
- Remover veículo não entrou (o contrato público não tem a operação).
- Quais piezos estão inativos não está no contrato (`activePiezoCount`
  apenas); a topologia usa os piezos 6 e 8 do exemplo.
- Formato de placa aceito: Mercosul (ABC1D23) ou antigo (ABC1234).
