/**
 * Implementa a barra inferior compartilhada pelas telas principais do VERS.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { VersLogo } from './VersLogo';

export type MainTab = 'home' | 'battery' | 'vers' | 'diagnostic' | 'profile';

type BottomNavigationProps = {
  activeTab: MainTab;
  onTabPress?: (tab: MainTab) => void;
};

type NavigationIconProps = {
  activeTab: MainTab;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: (tab: MainTab) => void;
  tab: MainTab;
};

/** Renderiza uma aba lateral com estado selecionado acessível. */
function NavigationIcon({ activeTab, icon, label, onPress, tab }: NavigationIconProps) {
  const isActive = activeTab === tab;

  /** Encaminha a aba escolhida sem acoplar a barra ao navegador principal. */
  function handlePress() {
    onPress?.(tab);
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={handlePress}
      style={[styles.iconButton, isActive && styles.activeButton]}
    >
      <Ionicons color={colors.primary} name={icon} size={25} />
    </Pressable>
  );
}

/**
 * Organiza as cinco áreas do app, dando destaque central à marca conforme os
 * mockups e permitindo que cada tela controle a navegação externamente.
 */
export function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  /** Encaminha o toque no botão central da marca. */
  function handleVersPress() {
    onTabPress?.('vers');
  }

  return (
    <View style={styles.container}>
      <NavigationIcon
        activeTab={activeTab}
        icon="home-outline"
        label="Início"
        onPress={onTabPress}
        tab="home"
      />
      <NavigationIcon
        activeTab={activeTab}
        icon="battery-charging-outline"
        label="Bateria"
        onPress={onTabPress}
        tab="battery"
      />
      <Pressable
        accessibilityLabel="VERS"
        accessibilityRole="button"
        accessibilityState={{ selected: activeTab === 'vers' }}
        onPress={handleVersPress}
        style={styles.brandButton}
      >
        <VersLogo size={52} />
      </Pressable>
      <NavigationIcon
        activeTab={activeTab}
        icon="pulse-outline"
        label="Diagnóstico"
        onPress={onTabPress}
        tab="diagnostic"
      />
      <NavigationIcon
        activeTab={activeTab}
        icon="person-outline"
        label="Perfil"
        onPress={onTabPress}
        tab="profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 12,
    flexDirection: 'row',
    height: 57,
    justifyContent: 'space-around',
    left: 28,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 28,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  activeButton: {
    backgroundColor: '#292819',
  },
  brandButton: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
});
