<!-- Task da tela de inicialização e recuperação de sessão do desktop. -->

# Task D01 — Tela Inicialização e sessão

## Objetivo

Apresentar a marca enquanto o aplicativo prepara configuração pública e estado
de sessão.

## O que precisa ser feito

- criar estado inicial responsivo no navegador;
- representar carregamento e indisponibilidade inicial;
- direcionar para Login ou área autenticada conforme estado recebido;
- impedir que telas protegidas apareçam antes da decisão de sessão;
- oferecer tentativa novamente quando a API estiver indisponível;
- representar atualização obrigatória apenas se houver contrato futuro.

## Integração esperada

O desktop não lê cookies `HttpOnly`. A sessão é verificada por chamadas ao
backend com credenciais habilitadas.

## Critério de saída

A inicialização possui destino previsível, sem exposição de dados ou tela
protegida durante o bootstrap.
