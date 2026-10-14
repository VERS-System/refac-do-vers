/**
 * Centraliza as abas principais do aplicativo mobile do VERS em fonte única.
 *
 * Existe para que a barra inferior, as telas e o futuro navegador autenticado
 * compartilhem as mesmas abas, rótulos e ícones sem duplicar listas: a ordem
 * de exibição é `TAB_ORDER` e os detalhes visuais ficam em `TAB_META`.
 */

import type { Ionicons } from '@expo/vector-icons';

/** Abas principais aprovadas no escopo; diagnóstico permanece fora. */
export type MainTab = 'home' | 'battery' | 'vers' | 'profile';

/** Metadados visuais de uma aba; a central (marca) não tem ícone lateral. */
export type TabMeta = {
  tab: MainTab;
  /** Rótulo acessível exibido pela barra. */
  label: string;
  /** Ícone lateral; ausente na aba central da marca. */
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Detalhes visuais de cada aba principal. */
export const TAB_META: Record<MainTab, TabMeta> = {
  home: { tab: 'home', label: 'Início', icon: 'home-outline' },
  battery: { tab: 'battery', label: 'Bateria', icon: 'battery-charging-outline' },
  vers: { tab: 'vers', label: 'VERS' },
  profile: { tab: 'profile', label: 'Perfil', icon: 'person-outline' },
};

/** Ordem de exibição das abas na barra inferior. */
export const TAB_ORDER: MainTab[] = ['home', 'battery', 'vers', 'profile'];

/** Lista das abas principais na ordem de exibição. */
export const MAIN_TABS: TabMeta[] = TAB_ORDER.map((tab) => TAB_META[tab]);
