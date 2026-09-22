<!-- Task final de consistência visual, acessibilidade e entrega do aplicativo mobile. -->

# Task 13 — Estados globais e entrega visual

## Objetivo

Validar o conjunto completo de telas como uma experiência coerente e pronta para
demonstração e integração.

## O que precisa ser feito

- revisar carregamento, vazio, erro, offline, sessão expirada e reconexão em
  todas as telas aplicáveis;
- padronizar feedback, confirmações e prevenção de envios duplicados;
- validar acessibilidade, contraste, escala de fonte, foco e alvos de toque;
- validar Android, iOS e dimensões representativas suportadas pelo projeto;
- revisar textos, idioma, unidades, datas e timezone;
- garantir que fixtures sejam identificáveis e não pareçam dados reais;
- concluir testes de interface, snapshots úteis e fluxos críticos;
- documentar execução local e geração dos builds previstos.

## Integração esperada

Cada tela utiliza apenas os contratos públicos correspondentes. Comportamentos
offline, renovação de sessão e reconexão devem refletir o estado informado pelas
camadas de integração e pelo backend.

## Validação

- todas as rotas planejadas são alcançáveis e possuem retorno previsível;
- nenhum segredo, regra de negócio ou cálculo foi deslocado para a interface;
- `test:unit`, lint e build passam quando disponíveis;
- telas críticas são verificadas visualmente em dispositivo ou emulador.

## Critério de saída

O aplicativo possui todas as telas planejadas, consistentes e prontas para
consumir os contratos do backend sem duplicar suas responsabilidades.
