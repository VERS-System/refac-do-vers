<!-- Fase 00 do roadmap executável do backend VERS. -->

# Fase 00 — Baseline e capacidade de validação

## Objetivo

Conhecer o estado real do backend antes de desenvolver funcionalidades.

## Estado

Concluída em 03/09/2026. A evidência detalhada está em
[backend-baseline-03-09-2026.md](../backend-baseline-03-09-2026.md).

## Etapas realizadas

1. Inventariar arquivos funcionais, parciais e vazios.
2. Confirmar `services/backend/src` como árvore canônica.
3. Padronizar `test:unit`, lint e build.
4. Estabilizar pnpm, ESLint e geração do Prisma Client.
5. Impedir carregamento implícito de `.env` pelo Prisma CLI.
6. Registrar limitações do schema experimental e ausência de migrations.

## Resultado

- build NestJS reproduzível;
- 7 suítes e 23 testes existentes aprovados no baseline;
- lint aprovado;
- 48 scaffolds vazios identificados;
- nenhuma funcionalidade presumida a partir de arquivos vazios;
- próxima fase autorizada somente por contratos.

## Regressões a impedir

- implementar nas árvores legadas `mobile`, `dashboard`, `general` ou `web`;
- preencher scaffolds em massa sem teste e caso de uso;
- voltar a usar `prisma db push` como evolução oficial;
- introduzir código de fases futuras antes dos contratos.
