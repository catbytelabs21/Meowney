import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { IconButton, Portal, Surface, Switch, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function AppSettingsPanel() {
  const colorScheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isOpen = useAppStore((state) => state.isSettingsPanelOpen);
  const closeSettingsPanel = useAppStore((state) => state.closeSettingsPanel);
  const opensDefaultNotebookOnLaunch = useAppStore((state) => state.opensDefaultNotebookOnLaunch);
  const setOpensDefaultNotebookOnLaunch = useAppStore((state) => state.setOpensDefaultNotebookOnLaunch);
  const [isMounted, setIsMounted] = useState(isOpen);
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const panelWidth = Math.min(windowWidth * 0.86, 380);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.settingsPanelOpenDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: motion.settingsPanelCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [isOpen, progress]);

  const updateUsesDefaultNotebook = (usesDefaultNotebook: boolean) => {
    setOpensDefaultNotebookOnLaunch(usesDefaultNotebook);
  };

  if (!isMounted) {
    return null;
  }

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [panelWidth, 0],
  });

  return (
    <Portal>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar ajustes"
            onPress={closeSettingsPanel}
            style={styles.backdropPressable}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            {
              width: panelWidth,
              transform: [{ translateX }],
            },
          ]}
        >
        <SafeAreaView edges={['top', 'right', 'bottom']} style={styles.panelWrap}>
          <Surface style={styles.panel} elevation={0}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Ajustes</Text>
                <Text style={styles.subtitle}>Preferencias de Meowney</Text>
              </View>
              <IconButton
                icon="close"
                size={20}
                iconColor={colors.text}
                style={styles.closeButton}
                onPress={closeSettingsPanel}
                accessibilityLabel="Cerrar ajustes"
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              <SettingsSection label="General" styles={styles}>
                <SettingsRow
                  styles={styles}
                  title="Modo oscuro"
                  description="Sigue el tema del sistema"
                  trailing={<Switch disabled value={colorScheme !== 'light'} />}
                />
                <SettingsRow
                  styles={styles}
                  title="Idioma"
                  description="Idioma de la interfaz"
                  trailing={<Text style={styles.valueText}>Espanol</Text>}
                />
              </SettingsSection>

              <SettingsSection label="Inicio" styles={styles}>
                <SettingsRow
                  styles={styles}
                  title="Al abrir Meowney"
                  description={
                    opensDefaultNotebookOnLaunch
                      ? 'Abrir libreta predeterminada'
                      : 'Abrir libretas'
                  }
                  trailing={
                    <Switch
                      value={opensDefaultNotebookOnLaunch}
                      onValueChange={updateUsesDefaultNotebook}
                    />
                  }
                />
              </SettingsSection>
            </ScrollView>
          </Surface>
        </SafeAreaView>
        </Animated.View>
      </View>
    </Portal>
  );
}

type PanelStyles = ReturnType<typeof createStyles>;

type SettingsSectionProps = {
  children: React.ReactNode;
  label: string;
  styles: PanelStyles;
};

function SettingsSection({ children, label, styles }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  description: string;
  styles: PanelStyles;
  title: string;
  trailing: React.ReactNode;
};

function SettingsRow({ description, styles, title, trailing }: SettingsRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {trailing}
    </View>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 20,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    backdropPressable: {
      flex: 1,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
    },
    panelWrap: {
      flex: 1,
    },
    panel: {
      flex: 1,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.sm,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: typography.titleWeight,
      lineHeight: 34,
    },
    subtitle: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    closeButton: {
      width: 36,
      height: 36,
      margin: 0,
      borderRadius: radii.navItem,
    },
    content: {
      gap: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    sectionBody: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    settingRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.md,
    },
    settingCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    settingTitle: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    settingDescription: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    valueText: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
    },
  });
}
