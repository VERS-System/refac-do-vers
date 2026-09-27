/**
 * Testes unitários do mapa central das abas principais do aplicativo VERS.
 */

import { MAIN_TABS, TAB_META, TAB_ORDER } from '../tabs';

describe('tabs principais (Task 00 - Item 4a)', () => {
  /** As quatro abas aprovadas, sem diagnóstico, em ordem de exibição. */
  it('define as quatro abas na ordem da barra', () => {
    expect(TAB_ORDER).toEqual(['home', 'battery', 'vers', 'profile']);
    expect(MAIN_TABS).toHaveLength(4);
  });

  /** Nenhum resquício do diagnóstico fora de escopo. */
  it('não inclui diagnóstico', () => {
    expect(TAB_ORDER).not.toContain('diagnostic');
    expect(Object.keys(TAB_META)).not.toContain('diagnostic');
  });

  /** Rótulos acessíveis usados pela barra. */
  it('expõe os rótulos das abas', () => {
    expect(TAB_META.home.label).toBe('Início');
    expect(TAB_META.battery.label).toBe('Bateria');
    expect(TAB_META.vers.label).toBe('VERS');
    expect(TAB_META.profile.label).toBe('Perfil');
  });

  /** Ícones das abas laterais, iguais aos atuais. */
  it('expõe os ícones das abas laterais', () => {
    expect(TAB_META.home.icon).toBe('home-outline');
    expect(TAB_META.battery.icon).toBe('battery-charging-outline');
    expect(TAB_META.profile.icon).toBe('person-outline');
  });

  /** A aba central é a marca, sem ícone lateral. */
  it('marca a aba VERS como central sem ícone', () => {
    expect(TAB_META.vers.icon).toBeUndefined();
  });
});
