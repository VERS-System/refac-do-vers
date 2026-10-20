<!-- Detalha o circuito funcional proposto do VERS e os requisitos para fechar seu esquema de montagem. -->
# VERS — esquema elétrico e instrumentação

Data: 20/10/2026. Complementa a [arquitetura](02_arquitetura-do-sistema.md)
e o [conceito de funcionamento](06_conceito-de-funcionamento.md).

## 1. Estado e finalidade

O repositório prevê piezos, retificação, capacitores, conversão DC-DC,
armazenamento, ESP32, INA219 e MPU6050. Não apresenta, nos materiais consultados,
um esquema de montagem validado com lista de materiais, valores e pinout fechado.
Este documento detalha uma **proposta funcional para revisão e ensaio**, não
um circuito pronto para fabricar ou energizar.

Continuam a definir pelo responsável: modelo e quantidade de piezos, fixação,
associação, tensões máximas, componentes de proteção, conversor, armazenamento,
alimentação da instrumentação, shunt e pinos da placa ESP32. Números e peças
citados em dados de demonstração do dashboard não comprovam a montagem física.

## 2. Diagrama funcional proposto

```text
                        CAMINHO DE ENERGIA RECUPERADA
 Deformação
     ↓
 [PZ1...PZn]──CA──[BR1: retificação]──N1──[condicionamento DC-DC]──N2
                   proteção de       │       adequado à fonte       │
                   entrada (*)      C1                              │
                                     │                              ↓
 GND_REC ────────────────────────────┴───────[gestão de carga / bloqueio]
                                                                    │
                                                                   N3
                                                                    │
                                                       INA219 VIN+──┤
                                                         [R_SHUNT]  │
                                                       INA219 VIN-──N4──armazenamento +
 GND_REC ────────────────────────────────────────────────────────────────armazenamento −

                       CAMINHO DE MEDIÇÃO E DADOS
 Fonte de instrumentação regulada → ESP32 + INA219 + MPU6050
 ESP32 SDA/SCL ↔ INA219 SDA/SCL + MPU6050 SDA/SCL
 GND da instrumentação ↔ GND_REC (proposta sem isolamento)
```

(*) A proteção precisa ser coordenada com a tensão CA dos piezos e a tensão CC
após a ponte. O desenho não define posição, tecnologia ou valor de um limitador.
C1 fica entre N1 e GND_REC, respeitando polaridade e tensão nominal.
Desacoplamentos e componentes exigidos pelo fabricante do conversor devem
constar no esquema final; foram omitidos apenas deste diagrama funcional.

A gestão de carga depende do armazenamento: bateria exige circuito compatível
com sua química; supercapacitor exige limite de tensão e, quando aplicável,
balanceamento. Um regulador DC-DC isoladamente não é um carregador universal.
O bloqueio evita retorno de energia para o conversor; sua posição depende do
circuito escolhido e precisa abranger caminhos alternativos de retorno.

N3–N4 é uma proposta para medir a energia **entregue à entrada do armazenamento**.
Com cargas ligadas diretamente a N4, o sensor mede a soma das correntes para
armazenamento e cargas. Isso deixa de representar exclusivamente carga armazenada.
O consumo próprio do carregador a montante não é medido nesse ponto.

## 3. Redes e interfaces a registrar

| Rede/interface | Conexão funcional | Verificação necessária |
| --- | --- | --- |
| Saída CA dos piezos | Dois terminais para a entrada da ponte | Polaridade relativa, fase, pico e isolamento |
| N1 | Positivo da ponte, C1 e entrada DC-DC | Máximo em vazio e sob vibração, ripple e partida |
| N2 | Saída DC-DC e entrada de gestão de carga | Faixa admitida pelo carregador e estabilidade |
| N3 | Saída de carga/bloqueio e VIN+ do INA219 | Limite de modo comum e caminho de corrente |
| N4 | VIN− do INA219 e positivo do armazenamento | Tensão do armazenamento e cargas conectadas |
| GND_REC | Retorno CC, armazenamento e referência dos sensores | Continuidade e ausência de retorno inesperado |
| Alimentação dos sensores | Fonte regulada compatível com cada placa | Tensão real, consumo, desacoplamento e sequência |
| SDA/SCL | ESP32 e sensores no mesmo barramento I2C | GPIOs, pull-ups, endereços e velocidade aprovados |

VIN+/VIN− são terminais de **medição**, distintos da alimentação VCC do INA219.
A corrente atravessa o shunt; o sensor não deve ser ligado como um amperímetro
em paralelo com o armazenamento. A tensão de barramento do INA219 é referida
à entrada VIN− e ao GND. Para o ponto proposto, usar essa tensão de N4 com a
corrente orientada de N3 para N4 ao calcular potência entregue.

A TI especifica barramento de 0 a 26 V para o INA219; isso não garante que um
módulo comercial inteiro suporte qualquer condição nessa faixa. Conferir shunt,
trilhas, conectores, dissipação e transientes. Não ligar o sensor diretamente ao
piezo CA. Fonte: [TI — INA219 e datasheet](https://www.ti.com/product/INA219).

Não assumir GPIO21/GPIO22, endereço padrão ou tolerância a 5 V para qualquer
ESP32. Registrar o modelo da placa, os pinos efetivos e os níveis lógicos.
Módulos com pull-ups em outra tensão exigem revisão antes da conexão.

## 4. Associação dos piezos

- **Série:** pode elevar a tensão resultante; não multiplica a corrente disponível.
  Polaridades e fase mecânica importam, e elementos desiguais alteram o resultado.
- **Paralelo:** pode somar correntes quando os sinais são compatíveis. Sinais fora
  de fase podem se cancelar e provocar circulação entre elementos.
- **Retificação por elemento ou grupo:** é uma alternativa a avaliar para sinais
  pouco sincronizados. Acrescenta componentes, perdas e fuga; não está aprovada.
- **Mista:** documentar quais elementos compõem cada ramo e onde são retificados.

Comparar associações com a mesma excitação e uma carga definida. Tensão em
circuito aberto não basta para escolher a associação que entrega mais energia.
A contagem de piezos ativos não identifica automaticamente qual elemento falhou.

## 5. Critérios de dimensionamento

### Retificação e reservatório

A ponte precisa suportar tensão reversa, corrente de pico e temperatura.
Em uma ponte convencional conduzem dois diodos por caminho; a queda direta e a
fuga podem consumir parte importante da geração. Selecionar a tecnologia com base
na corrente real, não apenas no menor valor nominal de queda de tensão.

Para uma descarga aproximadamente constante do capacitor:

`C ≈ I × Δt / ΔV`

Exemplo exclusivamente didático: sustentar 1 mA por 0,1 s com queda de 0,2 V
requer aproximadamente 500 µF, sem considerar fuga, ESR ou tolerância.
Não é o valor de C1 do VERS. Um capacitor maior também demora mais a carregar.

Energia disponível entre duas tensões do capacitor:

`ΔE = ½ × C × (V_alta² − V_baixa²)` em joules, com C em farads.

### Conversão e partida

Escolher buck quando a faixa de entrada útil estiver acima da saída; boost
quando estiver abaixo; uma arquitetura que cubra ambas quando a entrada cruzar
a saída. Essa regra de tensão é necessária, mas não basta: conferir partida,
corrente quiescente, impedância da fonte, eficiência em baixa carga e comportamento
quando a vibração cessa. Um conversor pode colapsar a tensão do piezo se exigir
mais corrente do que a fonte fornece.

Circuitos de colheita podem acumular energia antes de habilitar a saída.
Como referência tecnológica, o LTC3588-1 integra ponte e conversor buck e usa
subtensão com histerese para essa operação. É **exemplo, sem seleção para o VERS**;
não duplicar sua ponte sem revisar a aplicação do fabricante.
Fonte: [Analog Devices — LTC3588-1](https://www.analog.com/en/products/LTC3588-1.html).

### Shunt e capacidade de medição

`V_shunt = I × R_shunt` e `P_shunt = I² × R_shunt`.

Um shunt maior aumenta o sinal de medição, mas também a queda e a dissipação.
Escolher pela corrente mínima detectável, corrente máxima, faixa diferencial do
sensor, offset, temperatura e potência nominal. Registrar resistor real e
calibração do driver. Um módulo dimensionado para ampères pode não resolver a
pequena corrente recuperada com incerteza aceitável.

### Armazenamento e proteção

| Elemento | Requisito para o esquema final |
| --- | --- |
| Bateria | Química, número de células, perfil de carga, limites e proteção apropriados |
| Supercapacitor | Tensão por célula, fuga, corrente de partida e balanceamento se em série |
| MOSFET, se necessário | Função explícita, sentido do diodo interno, comando de gate e estado sem alimentação |
| Capacitores | Tensão nominal com margem, polaridade, ESR, fuga e descarga controlada |
| Conectores e cabos | Polaridade identificada, fixação e capacidade elétrica |
| Interface automotiva, se houver | Proteção específica contra inversão e transientes; esquema ainda não definido |

O desenho proposto não conecta o VERS à bateria de partida do veículo.
Essa conexão exige outro projeto de interface, proteção e validação.

## 6. Alimentação da instrumentação

**Proposta para caracterização inicial:** alimentar ESP32 e sensores por fonte
externa regulada, contabilizada separadamente. Isso permite medir geração sem
presumir que ela sustenta Wi-Fi, sensores e microcontrolador.

Se futuramente a instrumentação consumir do armazenamento, medir seu consumo e
comparar energia recuperada e consumida no mesmo intervalo. Isolar os caminhos
de alimentação para que USB ou a fonte externa não carreguem acidentalmente o
reservatório e sejam contabilizados como geração.

O MPU6050 mede movimento, não energia elétrica. Registrar orientação, fixação,
faixa, calibração, tratamento da gravidade, filtro e taxa de aquisição. A cadência
de envio MQTT não substitui a frequência de aquisição necessária para vibração.

## 7. Validação de bancada proposta

1. Registrar revisão do circuito, lista de materiais, pinout e limites de cada nó.
2. Sem energia e com capacitores descarregados, conferir polaridades, continuidade
   e ausência de curtos; verificar a fixação dos piezos.
3. Caracterizar a saída CA com instrumento e ponta adequados à tensão esperada.
   Avaliar a referência de terra do osciloscópio antes de conectá-la.
4. Ensaiar retificação e C1 com carga conhecida: vazio, excitação mínima/máxima,
   ripple e tensão máxima. Descarregar antes de alterar a montagem.
5. Validar separadamente partida, desligamento e saída do DC-DC e gestão de carga,
   usando fonte limitada em corrente dentro das especificações de entrada.
6. Verificar as alimentações e o I2C antes de conectar os sensores ao caminho de
   geração. Comparar INA219 com instrumento de referência em mais de um ponto.
7. Integrar com carga de ensaio; só conectar armazenamento após validar seus
   limites. Verificar corrente reversa, perdas e aquecimento.
8. Executar teste com duração conhecida, registrar amostras, lacunas e balanço
   energético; comparar ensaios repetidos nas mesmas condições.

Critério de fechamento: limites respeitados, partida repetível, ausência de
retorno indevido, medição com incerteza conhecida e arquivos da montagem real
versionados. Nenhuma dessas validações físicas foi realizada nesta documentação.

## 8. Ficha obrigatória da montagem real

Preencher antes de fechar o [mapa elétrico do firmware](plans/mqtt-esp-roadmap/01-mapa-eletrico-interfaces.md):

| Item | Estado em 20/10/2026 |
| --- | --- |
| Modelo, quantidade, associação e fixação dos piezos | A definir/validar |
| Ponte, proteção e C1 com valores e limites | A definir/validar |
| Conversor, componentes auxiliares e limiares de partida | A definir/validar |
| Armazenamento e gestão de carga | A definir/validar |
| Modelo ESP32, fonte e GPIOs | A definir/validar |
| Sensores, módulos, shunt, endereços e pull-ups | A definir/validar |
| Ponto/sentido de medição e cargas incluídas | Proposta N3→N4, a aprovar |
| Taxas, filtros, calibração e incerteza | A definir/validar |
| Esquemático CAD, fotos, BOM e resultados de bancada | Não fornecidos nos materiais consultados |
