import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, IconButton, Menu, Portal, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppConfirmDialog } from '@/components/ui/AppFormDialog';
import { appDataRepository } from '@/database/repositories/app-data.repository';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { type LaunchPreference, type ThemePreference, useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const DELETE_DATA_MINIMUM_FEEDBACK_MS = 320;

export function AppSettingsPanel() {
  const colorScheme = useMeowneyColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isOpen = useAppStore((state) => state.isSettingsPanelOpen);
  const clearSelectedNotebookId = useAppStore((state) => state.clearSelectedNotebookId);
  const closeSettingsPanel = useAppStore((state) => state.closeSettingsPanel);
  const launchPreference = useAppStore((state) => state.launchPreference);
  const setLaunchPreference = useAppStore((state) => state.setLaunchPreference);
  const signalDataReset = useAppStore((state) => state.signalDataReset);
  const themePreference = useAppStore((state) => state.themePreference);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isDeleteDataDialogOpen, setIsDeleteDataDialogOpen] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [openMenu, setOpenMenu] = useState<SettingsMenuKey | null>(null);
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const panelWidth = Math.min(windowWidth * 0.86, 380);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    } else {
      if (!isDeletingData) {
        setIsDeleteDataDialogOpen(false);
      }
      setOpenMenu(null);
    }
  }, [isDeletingData, isOpen]);

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

  const confirmDeleteData = () => {
    if (isDeletingData) {
      return;
    }

    setIsDeleteDataDialogOpen(false);
    setIsDeletingData(true);

    requestAnimationFrame(() => {
      const startedAt = Date.now();

      appDataRepository.deleteAllDomainData();
      clearSelectedNotebookId();
      signalDataReset();

      const remainingFeedbackMs = Math.max(
        0,
        DELETE_DATA_MINIMUM_FEEDBACK_MS - (Date.now() - startedAt),
      );

      setTimeout(() => {
        router.replace('/notebooks');
        closeSettingsPanel();
        setIsDeletingData(false);
      }, remainingFeedbackMs);
    });
  };

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
                  <SettingsChoiceRow
                    colors={colors}
                    isOpen={openMenu === 'theme'}
                    styles={styles}
                    title="Tema"
                    value={themePreference}
                    options={[
                      { value: 'system', label: 'Sistema', icon: 'theme-light-dark' },
                      { value: 'light', label: 'Claro', icon: 'white-balance-sunny' },
                      { value: 'dark', label: 'Oscuro', icon: 'weather-night' },
                    ]}
                    onClose={() => setOpenMenu(null)}
                    onOpen={() => setOpenMenu('theme')}
                    onValueChange={(value) => setThemePreference(value as ThemePreference)}
                  />
                  <SettingsRow
                    styles={styles}
                    title="Idioma"
                    trailing={
                      <View style={styles.lockedValueButton}>
                        <MaterialCommunityIcons name="translate" size={16} color={colors.text} />
                      </View>
                    }
                  />
                </SettingsSection>

                <SettingsSection label="Inicio" styles={styles}>
                  <SettingsChoiceRow
                    colors={colors}
                    isOpen={openMenu === 'launch'}
                    styles={styles}
                    title="Al abrir Meowney"
                    value={launchPreference}
                    options={[
                      { value: 'notebooks', label: 'Libretas', icon: 'notebook-outline' },
                      { value: 'defaultNotebook', label: 'Predeterminada', icon: 'star-outline' },
                    ]}
                    onClose={() => setOpenMenu(null)}
                    onOpen={() => setOpenMenu('launch')}
                    onValueChange={(value) => setLaunchPreference(value as LaunchPreference)}
                  />
                </SettingsSection>

                <SettingsSection label="Datos" styles={styles}>
                  <SettingsActionRow
                    colors={colors}
                    styles={styles}
                    title="Eliminar datos"
                    icon="trash-can-outline"
                    disabled={isDeletingData}
                    onPress={() => setIsDeleteDataDialogOpen(true)}
                  />
                </SettingsSection>
              </ScrollView>
            </Surface>
          </SafeAreaView>
        </Animated.View>
        <AppConfirmDialog
          visible={isDeleteDataDialogOpen}
          title="Eliminar datos"
          message="Esta accion borrara permanentemente libretas, cuentas, categorias, presupuestos, ahorros, movimientos y transferencias. No se puede deshacer."
          cancelLabel="Cancelar"
          confirmLabel="Eliminar todo"
          confirmTextColor={colors.error}
          onCancel={() => setIsDeleteDataDialogOpen(false)}
          onConfirm={confirmDeleteData}
        />
        {isDeletingData ? (
          <View style={styles.processingOverlay}>
            <Surface style={styles.processingCard} elevation={0}>
              <ActivityIndicator animating color={colors.text} size="small" />
              <Text style={styles.processingText}>Eliminando datos</Text>
            </Surface>
          </View>
        ) : null}
      </View>
    </Portal>
  );
}

type PanelStyles = ReturnType<typeof createStyles>;
type SettingsMenuKey = 'theme' | 'launch';
type SettingsOption = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
};

type SettingsSectionProps = {
  children: ReactNode;
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
  styles: PanelStyles;
  title: string;
  trailing: ReactNode;
};

function SettingsRow({ styles, title, trailing }: SettingsRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

type SettingsChoiceRowProps = {
  colors: MeowneyColors;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onValueChange: (value: string) => void;
  options: SettingsOption[];
  styles: PanelStyles;
  title: string;
  value: string;
};

function SettingsChoiceRow({
  colors,
  isOpen,
  onClose,
  onOpen,
  onValueChange,
  options,
  styles,
  title,
  value,
}: SettingsChoiceRowProps) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Menu
        visible={isOpen}
        onDismiss={onClose}
        contentStyle={styles.menuContent}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cambiar ${title}`}
            onPress={onOpen}
            style={({ pressed }) => [
              styles.valueButton,
              pressed && styles.valueButtonPressed,
            ]}
          >
            <View style={styles.valueIconBox}>
              <MaterialCommunityIcons
                name={selectedOption.icon}
                size={16}
                color={colors.text}
              />
            </View>
          </Pressable>
        }
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Menu.Item
              key={option.value}
              leadingIcon={option.icon}
              trailingIcon={selected ? 'check' : undefined}
              title={option.label}
              titleStyle={styles.menuItemTitle}
              onPress={() => {
                onValueChange(option.value);
                onClose();
              }}
            />
          );
        })}
      </Menu>
    </View>
  );
}

type SettingsActionRowProps = {
  colors: MeowneyColors;
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  styles: PanelStyles;
  title: string;
};

function SettingsActionRow({ colors, disabled = false, icon, onPress, styles, title }: SettingsActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed,
        disabled && styles.actionRowDisabled,
      ]}
    >
      <View style={styles.destructiveIconBox}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.error} />
      </View>
      <Text style={styles.destructiveActionText}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.mutedText} />
    </Pressable>
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
      backgroundColor: colors.background,
      paddingTop: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontSize: typography.screenTitleSize,
      fontWeight: typography.mediumWeight,
      lineHeight: typography.screenTitleLineHeight,
    },
    closeButton: {
      width: 30,
      height: 30,
      margin: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    content: {
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
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
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    settingRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    settingCopy: {
      flex: 1,
      minWidth: 0,
    },
    settingTitle: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    valueButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    valueButtonPressed: {
      backgroundColor: colors.pressed,
    },
    valueIconBox: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.button,
      backgroundColor: colors.surfaceElevated,
    },
    lockedValueButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.surface,
      opacity: 0.86,
    },
    menuContent: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    menuItemTitle: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
    },
    actionRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    actionRowPressed: {
      backgroundColor: colors.selected,
    },
    actionRowDisabled: {
      opacity: 0.58,
    },
    destructiveIconBox: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    destructiveActionText: {
      flex: 1,
      color: colors.error,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.34)',
    },
    processingCard: {
      minWidth: 180,
      minHeight: 92,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    processingText: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
    },
  });
}
