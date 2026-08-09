import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  HelperText,
  IconButton,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { notebookRepository, type NotebookInput } from '@/database/repositories/notebook.repository';
import { settingsRepository } from '@/database/repositories/settings.repository';
import type { Settings } from '@/features/settings/types';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { Notebook } from './types';

type NotebookFormValues = {
  name: string;
  description: string;
  icon: NotebookIconName;
  color: string;
  currency: string;
  isDefault: boolean;
};

type NotebookIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const iconOptions: NotebookIconName[] = [
  'notebook-outline',
  'wallet-outline',
  'bank-outline',
  'chart-line',
  'cash-multiple',
  'piggy-bank-outline',
  'safe-square-outline',
  'briefcase-outline',
  'credit-card-outline',
  'home-outline',
];

const currencyOptions = ['MXN', 'USD', 'EUR'];

function getColorOptions(colors: MeowneyColors) {
  return [
    colors.irisGleam,
    colors.cyanSignal,
    colors.orchidBloom,
    colors.periwinkle,
    colors.paleIris,
    colors.deepIris,
    colors.success,
    colors.warning,
    colors.error,
    colors.silver,
  ];
}

function getInitialForm(colors: MeowneyColors): NotebookFormValues {
  return {
    name: '',
    description: '',
    icon: 'notebook-outline',
    color: colors.irisGleam,
    currency: 'MXN',
    isDefault: false,
  };
}

function getFormFromNotebook(
  notebook: Notebook,
  colors: MeowneyColors,
  settings: Settings,
): NotebookFormValues {
  const fallback = getInitialForm(colors);

  return {
    name: notebook.name,
    description: notebook.description ?? '',
    icon: (notebook.icon as NotebookIconName | null) ?? fallback.icon,
    color: notebook.color ?? fallback.color,
    currency: notebook.currency,
    isDefault: settings.defaultNotebookId === notebook.id,
  };
}

function toInput(values: NotebookFormValues): NotebookInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    icon: values.icon,
    color: values.color,
    currency: values.currency,
  };
}

function getNotebookEntryPath(settings: Settings): '/dashboard' | '/history' {
  return settings.notebookEntryDestination === 'tabs' ? '/history' : '/dashboard';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotebooksScreen() {
  const clearSelectedNotebookId = useAppStore((state) => state.clearSelectedNotebookId);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getColorOptions(colors), [colors]);

  const loadNotebooksData = useCallback(
    (): { notebooks: Notebook[]; settings: Settings | null } => ({
      notebooks: notebookRepository.listActive(),
      settings: settingsRepository.getOrCreate(),
    }),
    [],
  );
  const {
    data: notebooksData,
    error: loadError,
    isLoading,
    reload: reloadData,
  } = useDeferredQuery(loadNotebooksData, { notebooks: [], settings: null as Settings | null });
  const { notebooks, settings } = notebooksData;
  const notebookEntryPath = settings ? getNotebookEntryPath(settings) : '/dashboard';
  const [infoNotebook, setInfoNotebook] = useState<Notebook | null>(null);
  const [deleteNotebook, setDeleteNotebook] = useState<Notebook | null>(null);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);
  const didHandleInitialLaunch = useRef(false);

  useFocusEffect(
    useCallback(() => {
      clearSelectedNotebookId();
    }, [clearSelectedNotebookId]),
  );

  useEffect(() => {
    if (isLoading || !settings || didHandleInitialLaunch.current) {
      return;
    }

    didHandleInitialLaunch.current = true;

    if (settings.launchDestination !== 'notebooks' && settings.defaultNotebookId) {
      const defaultNotebook = notebooks.find((notebook) => notebook.id === settings.defaultNotebookId);
      setSelectedNotebookId(settings.defaultNotebookId, defaultNotebook?.name ?? null);
      router.replace({
        pathname: getNotebookEntryPath(settings),
        params: { notebookId: settings.defaultNotebookId },
      });
    }
  }, [isLoading, notebooks, settings, setSelectedNotebookId]);

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/history');
  }, []);

  const openCreate = () => {
    setFormValues(getInitialForm(colors));
    setShowNameError(false);
    setIsCreateOpen(true);
  };

  const openEdit = (notebook: Notebook) => {
    setFormValues(getFormFromNotebook(notebook, colors, settings ?? settingsRepository.getOrCreate()));
    setShowNameError(false);
    setEditingNotebook(notebook);
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingNotebook(null);
    setShowNameError(false);
  };

  const saveForm = () => {
    if (!formValues.name.trim()) {
      setShowNameError(true);
      return;
    }

    let savedNotebookId: string;

    if (editingNotebook) {
      notebookRepository.update(editingNotebook.id, toInput(formValues));
      savedNotebookId = editingNotebook.id;
    } else {
      const createdNotebook = notebookRepository.create(toInput(formValues));
      savedNotebookId = createdNotebook.id;
    }

    const currentSettings = settings ?? settingsRepository.getOrCreate();

    if (formValues.isDefault) {
      settingsRepository.setDefaultNotebook(savedNotebookId);
    } else if (currentSettings.defaultNotebookId === savedNotebookId) {
      settingsRepository.setDefaultNotebook(null);
    }

    closeForm();
    reloadData();
  };

  const confirmDelete = () => {
    if (!deleteNotebook) {
      return;
    }

    notebookRepository.archive(deleteNotebook.id);
    if (settings?.defaultNotebookId === deleteNotebook.id) {
      settingsRepository.setDefaultNotebook(null);
    }
    setDeleteNotebook(null);
    reloadData();
  };

  const renderNotebook = ({ item }: { item: Notebook }) => {
    const iconName = (item.icon as NotebookIconName | null) ?? 'notebook-outline';
    const color = item.color ?? colors.irisGleam;

    return (
      <Surface style={styles.row} elevation={0}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelectedNotebookId(item.id, item.name);
            router.replace({ pathname: notebookEntryPath, params: { notebookId: item.id } });
          }}
          style={({ pressed }) => [styles.nameButton, pressed && styles.pressed]}
        >
          <View style={[styles.notebookIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <View style={styles.nameLine}>
              <Text numberOfLines={1} style={styles.notebookName}>
                {item.name}
              </Text>
              {settings?.defaultNotebookId === item.id ? (
                <MaterialCommunityIcons name="star" size={15} color={colors.warning} />
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.notebookMeta}>
              {item.currency}
            </Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <IconButton
            icon="information-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.text}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => setInfoNotebook(item)}
            accessibilityLabel="Ver informacion"
          />
          <IconButton
            icon="pencil-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.text}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => openEdit(item)}
            accessibilityLabel="Editar libreta"
          />
          <IconButton
            icon="trash-can-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.error}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => setDeleteNotebook(item)}
            accessibilityLabel="Borrar libreta"
          />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.contentSafeArea}>
        <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LIBRETAS</Text>
          <Text style={styles.title}>Control financiero</Text>
        </View>

        <Surface style={styles.table} elevation={0}>
          <View style={styles.tableHeader}>
            <Text style={styles.columnLabel}>NOMBRE</Text>
            <Text style={[styles.columnLabel, styles.actionsLabel]}>ACCIONES</Text>
          </View>
          <Divider />
          <FlatList
            data={isLoading ? [] : notebooks}
            keyExtractor={(item) => item.id}
            renderItem={renderNotebook}
            contentContainerStyle={!isLoading && notebooks.length ? styles.listContent : styles.emptyContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              isLoading ? (
                <AppLoadingState colors={colors} label="Cargando libretas" />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="notebook-plus-outline" size={36} color={colors.mutedText} />
                  <Text style={styles.emptyTitle}>
                    {loadError ? 'No se pudieron cargar las libretas' : 'Aun no hay libretas'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {loadError
                      ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                      : 'Crea una libreta para separar cuentas, categorias y movimientos por contexto.'}
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              <Button
                mode="contained"
                icon="plus"
                onPress={openCreate}
                buttonColor={colors.primary}
                textColor={colors.onPrimary}
                style={styles.createButton}
                contentStyle={styles.createButtonContent}
              >
                Nueva libreta
              </Button>
            }
          />
        </Surface>
        </View>
      </SafeAreaView>

      <Portal>
        <Dialog
          visible={Boolean(infoNotebook)}
          onDismiss={() => setInfoNotebook(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Informacion</Dialog.Title>
          <Dialog.Content>
            {infoNotebook ? (
              <View style={styles.infoList}>
                <InfoLine label="Titulo" value={infoNotebook.name} />
                <InfoLine label="Descripcion" value={infoNotebook.description || 'Sin descripcion'} />
                <InfoLine label="Moneda" value={infoNotebook.currency} />
                <InfoLine label="Creacion" value={formatDate(infoNotebook.createdAt)} />
                <InfoLine label="Actualizacion" value={formatDate(infoNotebook.updatedAt)} />
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInfoNotebook(null)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>

        <NotebookFormDialog
          colors={colors}
          styles={styles}
          visible={isCreateOpen || Boolean(editingNotebook)}
          title={editingNotebook ? 'Editar libreta' : 'Nueva libreta'}
          values={formValues}
          showNameError={showNameError}
          colorOptions={colorOptions}
          onChange={setFormValues}
          onCancel={closeForm}
          onSave={saveForm}
        />

        <Dialog
          visible={Boolean(deleteNotebook)}
          onDismiss={() => setDeleteNotebook(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Borrar libreta</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Esta accion archivara la libreta y dejara de mostrarse en el listado.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteNotebook(null)}>Cancelar</Button>
            <Button textColor={colors.error} onPress={confirmDelete}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

type NotebookFormDialogProps = {
  colors: MeowneyColors;
  styles: ReturnType<typeof createStyles>;
  visible: boolean;
  title: string;
  values: NotebookFormValues;
  showNameError: boolean;
  colorOptions: string[];
  onChange: (values: NotebookFormValues) => void;
  onCancel: () => void;
  onSave: () => void;
};

function NotebookFormDialog({
  colors,
  styles,
  visible,
  title,
  values,
  showNameError,
  colorOptions,
  onChange,
  onCancel,
  onSave,
}: NotebookFormDialogProps) {
  return (
    <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Dialog.Title style={styles.dialogTitle}>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.formScrollArea}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <TextInput
                mode="outlined"
                label="Nombre"
                value={values.name}
                onChangeText={(name) => onChange({ ...values, name })}
                error={showNameError}
              />
              {showNameError ? (
                <HelperText type="error" visible>
                  El nombre es obligatorio.
                </HelperText>
              ) : null}
            </View>

            <TextInput
              mode="outlined"
              label="Descripcion"
              value={values.description}
              multiline
              numberOfLines={3}
              onChangeText={(description) => onChange({ ...values, description })}
            />

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>ICONO</Text>
              <View style={styles.choiceGrid}>
                {iconOptions.map((icon) => {
                  const selected = values.icon === icon;
                  return (
                    <IconButton
                      key={icon}
                      icon={icon}
                      size={22}
                      mode="contained-tonal"
                      iconColor={selected ? colors.onPrimary : colors.text}
                      containerColor={selected ? colors.primary : colors.selected}
                      style={styles.iconChoice}
                      onPress={() => onChange({ ...values, icon })}
                      accessibilityLabel={`Icono ${icon}`}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>COLOR</Text>
              <View style={styles.swatchTray}>
                {colorOptions.map((color) => {
                  const selected = values.color === color;
                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${color}`}
                      onPress={() => onChange({ ...values, color })}
                      style={[
                        styles.colorChoice,
                        { backgroundColor: color },
                        selected && styles.colorChoiceSelected,
                      ]}
                    >
                      {selected ? (
                        <MaterialCommunityIcons name="check" size={18} color={colors.void} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>MONEDA</Text>
              <View style={styles.currencyRow}>
                {currencyOptions.map((currency) => {
                  const selected = values.currency === currency;
                  return (
                    <Button
                      key={currency}
                      mode={selected ? 'contained' : 'outlined'}
                      compact
                      buttonColor={selected ? colors.primary : undefined}
                      textColor={selected ? colors.onPrimary : colors.text}
                      onPress={() => onChange({ ...values, currency })}
                      style={styles.currencyButton}
                    >
                      {currency}
                    </Button>
                  );
                })}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchLabel}>Libreta predeterminada</Text>
                <Text style={styles.switchText}>Solo una libreta puede quedar marcada.</Text>
              </View>
              <Switch
                value={values.isDefault}
                onValueChange={(isDefault) => onChange({ ...values, isDefault })}
              />
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancelar</Button>
          <Button onPress={onSave}>Guardar</Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: typography.bodySize,
    lineHeight: 24,
  },
});

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentSafeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      gap: spacing.lg,
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    header: {
      gap: spacing.sm,
    },
    eyebrow: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    title: {
      color: colors.text,
      fontSize: typography.headingSize,
      fontWeight: typography.titleWeight,
      lineHeight: 38,
    },
    table: {
      flex: 1,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    tableHeader: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    columnLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    actionsLabel: {
      minWidth: 104,
      textAlign: 'center',
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    emptyContent: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    row: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    nameButton: {
      minHeight: 72,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.ms,
      borderRadius: radii.card,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
    },
    pressed: {
      backgroundColor: colors.pressed,
    },
    notebookIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.input,
    },
    nameCopy: {
      flex: 1,
      minWidth: 0,
    },
    nameLine: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    notebookName: {
      flexShrink: 1,
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    notebookMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
    },
    actions: {
      width: 104,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-end',
      paddingRight: spacing.xs,
    },
    actionButton: {
      width: 32,
      height: 32,
      margin: 0,
    },
    separator: {
      height: spacing.sm,
    },
    emptyState: {
      flex: 1,
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: typography.subheadingSize,
      fontWeight: typography.bodyWeight,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 22,
      textAlign: 'center',
    },
    createButton: {
      marginTop: spacing.md,
      borderRadius: radii.button,
    },
    createButtonContent: {
      minHeight: 48,
    },
    dialog: {
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    dialogTitle: {
      color: colors.text,
      fontWeight: typography.bodyWeight,
    },
    dialogText: {
      color: colors.mutedText,
      fontSize: typography.bodySize,
      lineHeight: 24,
    },
    infoList: {
      gap: spacing.md,
    },
    formScrollArea: {
      borderColor: colors.border,
      paddingHorizontal: 0,
    },
    form: {
      gap: spacing.ms,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    fieldGroup: {
      gap: 0,
    },
    pickerGroup: {
      gap: spacing.sm,
    },
    pickerLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconChoice: {
      width: 40,
      height: 40,
      margin: 0,
    },
    swatchTray: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.sm,
    },
    colorChoice: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.input,
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorChoiceSelected: {
      borderWidth: 2,
      borderColor: colors.text,
    },
    currencyRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    currencyButton: {
      borderRadius: radii.button,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.md,
    },
    switchCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    switchLabel: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    switchText: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
  });
}
