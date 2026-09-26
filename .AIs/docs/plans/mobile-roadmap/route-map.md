<!-- Mapa de rotas do aplicativo mobile: estados, pilhas e rotas futuras. -->

# Mapa de rotas do aplicativo mobile VERS

## Estados raiz (`RootNavigator`)

| Estado | Tela | Origem do estado |
| --- | --- | --- |
| Apresentação | Splash | Timer local (`App.tsx`) |
| Fluxo público | Login ↔ Cadastro (`AuthNavigator`) | Sem sessão |
| Área autenticada | Home + abas (`TAB_ORDER`) | Sessão local provisória |

O `RootNavigator` apenas recebe o estado e renderiza o fluxo. Sessão,
permissões e acesso a recursos pertencem ao backend.

## Pilhas

```text
splash → pública (Login ↔ Register) → autenticada (Home + abas)
```

- **Pública** (`AuthNavigator`): Login inicial; Cadastro via link; retorno
  preserva a pilha. Transição `animation: 'none'`.
- **Autenticada**: Home hoje; telas futuras entram nas abas abaixo sem mudar
  a estrutura.

## Abas principais (`navigation/tabs.ts`)

| Ordem | Aba | Rótulo | Destino atual |
| --- | --- | --- | --- |
| 1 | `home` | Início | Home |
| 2 | `battery` | Bateria | Home (tela própria na Task 05) |
| 3 | `vers` | VERS (central) | Home (tela própria na Task 07) |
| 4 | `profile` | Perfil | Home (tela própria na Task 09) |

Diagnóstico do veículo permanece fora do escopo e não possui rota.

## Rotas futuras (tasks do roadmap)

| Rota | Task |
| --- | --- |
| Bateria e energia | 05 |
| Calendário e histórico | 06 |
| Sistema VERS | 07 |
| Testes experimentais | 08 |
| Perfil | 09 |
| Veículos | 10 |
| Suporte e revisão | 11 |
| Viber | 12 |

Cada rota futura consome apenas os contratos públicos do backend
correspondentes (ver `mobile-roadmap/README.md`, seção de encaixe).
