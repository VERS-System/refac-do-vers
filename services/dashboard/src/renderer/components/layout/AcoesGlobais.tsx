/**
 * Ações que aparecem na barra superior de todas as telas internas (busca e
 * notificações), passadas pelo `AppShell` à `TopBar` por contexto.
 *
 * Por contexto, e não por props de cada tela, para que a busca e o sino
 * existam em toda tela do shell sem que cada página os declare; fora do
 * shell (testes de uma tela isolada, Login) o contexto é vazio e a barra
 * mostra só as ações da própria tela.
 */

import { createContext, useContext, type ReactNode } from 'react';

const AcoesGlobaisContexto = createContext<ReactNode>(null);

/** Fornece as ações globais para as barras superiores abaixo. */
export const AcoesGlobaisProvider = AcoesGlobaisContexto.Provider;

/** As ações globais, ou `null` fora do shell. */
export function useAcoesGlobais(): ReactNode {
  return useContext(AcoesGlobaisContexto);
}

/**
 * Elemento no início da barra superior: o botão que abre o menu lateral nas
 * telas estreitas (app responsivo). Vazio fora do shell.
 */
const InicioBarraContexto = createContext<ReactNode>(null);

/** Fornece o elemento do início das barras superiores abaixo. */
export const InicioBarraProvider = InicioBarraContexto.Provider;

/** O elemento do início da barra, ou `null` fora do shell. */
export function useInicioBarra(): ReactNode {
  return useContext(InicioBarraContexto);
}
