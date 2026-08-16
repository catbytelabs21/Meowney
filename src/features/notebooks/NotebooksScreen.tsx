import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppScreenHeader } from '@/components/layout/AppScreen';
import { AppDraggableFab } from '@/components/ui/AppDraggableFab';
import { AppDescriptionInput, AppIconPickerGrid, AppInfoLine, AppOptionToggle } from '@/components/ui/AppFormFields';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { categoryRepository } from '@/database/repositories/category.repository';
import { notebookRepository, type NotebookInput } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDateTime } from '@/utils/dateFormat';
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
): NotebookFormValues {
  const fallback = getInitialForm(colors);

  return {
    name: notebook.name,
    description: notebook.description ?? '',
    icon: (notebook.icon as NotebookIconName | null) ?? fallback.icon,
    color: notebook.color ?? fallback.color,
    currency: notebook.currency,
    isDefault: notebook.isDefault,
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

function formatDate(value: string) {
  return formatAppDateTime(value);
}

export function NotebooksScreen() {
  const clearSelectedNotebookId = useAppStore((state) => state.clearSelectedNotebookId);
  const dataResetVersion = useAppStore((state) => state.dataResetVersion);
  const launchPreference = useAppStore((state) => state.launchPreference);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getColorOptions(colors), [colors]);

  const loadNotebooksData = useCallback(
    (): { notebooks: Notebook[] } => ({
      notebooks: notebookRepository.listActive(),
    }),
    [],
  );
  const {
    data: notebooksData,
    error: loadError,
    isLoading,
    reload: reloadData,
  } = useDeferredQuery(loadNotebooksData, { notebooks: [] });
  const { notebooks } = notebooksData;
  const notebookEntryPath = '/balance' as const;
  const [infoNotebook, setInfoNotebook] = useState<Notebook | null>(null);
  const [deleteNotebook, setDeleteNotebook] = useState<Notebook | null>(null);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);
  const [actionMenuNotebookId, setActionMenuNotebookId] = useState<string | null>(null);
  const didHandleInitialLaunch = useRef(false);

  useFocusEffect(
    useCallback(() => {
      clearSelectedNotebookId();
      reloadData();
    }, [clearSelectedNotebookId, reloadData]),
  );

  useEffect(() => {
    reloadData();
  }, [dataResetVersion, reloadData]);

  useEffect(() => {
    if (isLoading || didHandleInitialLaunch.current) {
      return;
    }

    didHandleInitialLaunch.current = true;

    if (launchPreference === 'defaultNotebook') {
      const defaultNotebook = notebooks.find((notebook) => notebook.isDefault);

      if (!defaultNotebook) {
        return;
      }

      setSelectedNotebookId(defaultNotebook.id, defaultNotebook.name);
      router.replace({
        pathname: notebookEntryPath,
        params: { notebookId: defaultNotebook.id },
      });
    }
  }, [isLoading, launchPreference, notebookEntryPath, notebooks, setSelectedNotebookId]);

  useEffect(() => {
    router.prefetch('/balance');
  }, []);

  const openCreate = () => {
    setFormValues(getInitialForm(colors));
    setShowNameError(false);
    setIsCreateOpen(true);
  };

  const openEdit = (notebook: Notebook) => {
    setActionMenuNotebookId(null);
    setFormValues(getFormFromNotebook(notebook, colors));
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
      categoryRepository.seedDefaultCategories(createdNotebook.id);
    }

    if (formValues.isDefault) {
      notebookRepository.setDefault(savedNotebookId);
    } else if (editingNotebook?.isDefault) {
      notebookRepository.setDefault(null);
    }

    closeForm();
    reloadData();
  };

  const confirmDelete = () => {
    if (!deleteNotebook) {
      return;
    }

    notebookRepository.archive(deleteNotebook.id);
    setDeleteNotebook(null);
    reloadData();
  };

  const renderNotebook = ({ item }: { item: Notebook }) => {
    const iconName = (item.icon as NotebookIconName | null) ?? 'notebook-outline';
    const color = item.color ?? colors.irisGleam;

    return (
      <Surface style={styles.notebookRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelectedNotebookId(item.id, item.name);
            router.replace({ pathname: notebookEntryPath, params: { notebookId: item.id } });
          }}
          style={({ pressed }) => [styles.notebookContent, pressed && styles.notebookPressed]}
        >
          <View style={[styles.notebookIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <View style={styles.notebookTitleLine}>
              <Text numberOfLines={1} style={styles.notebookName}>
                {item.name}
              </Text>
              {item.isDefault ? (
                <MaterialCommunityIcons name="star" size={15} color={colors.warning} />
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.notebookMeta}>
              {item.currency}
            </Text>
          </View>
        </Pressable>

        <Menu
          visible={actionMenuNotebookId === item.id}
          onDismiss={() => setActionMenuNotebookId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la libreta"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.notebookActionsButton}
              onPress={() => setActionMenuNotebookId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="eye-outline"
            title="Ver"
            onPress={() => {
              setActionMenuNotebookId(null);
              setInfoNotebook(item);
            }}
          />
          <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={() => openEdit(item)} />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuNotebookId(null);
              setDeleteNotebook(item);
            }}
          />
        </Menu>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.contentSafeArea}>
        <View style={styles.container}>
          <FlatList
            style={styles.list}
            data={isLoading ? [] : notebooks}
            keyExtractor={(item) => item.id}
            renderItem={renderNotebook}
            ListHeaderComponent={<AppScreenHeader eyebrow="LIBRETAS" title="Control financiero" withBottomGap />}
            contentContainerStyle={!isLoading && notebooks.length ? styles.listContent : styles.emptyContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              isLoading ? (
                <Surface style={styles.emptyPanel} elevation={0}>
                  <AppLoadingState colors={colors} label="Cargando libretas" />
                </Surface>
              ) : (
                <Surface style={styles.emptyPanel} elevation={0}>
                  <MaterialCommunityIcons name="notebook-plus-outline" size={36} color={colors.mutedText} />
                  <Text style={styles.emptyTitle}>
                    {loadError ? 'No se pudieron cargar las libretas' : 'Aun no hay libretas'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {loadError
                      ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                      : 'Crea una libreta para separar cuentas, categorias y movimientos por contexto.'}
                  </Text>
                </Surface>
              )
            }
            showsVerticalScrollIndicator={false}
          />
          <AppDraggableFab style={styles.fabWrap}>
            <IconButton
              accessibilityLabel="Nueva libreta"
              icon="plus"
              mode="contained"
              iconColor={colors.onPrimary}
              containerColor={colors.primary}
              size={28}
              style={styles.fab}
              onPress={openCreate}
            />
          </AppDraggableFab>
        </View>
      </SafeAreaView>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoNotebook)}
          title="Detalle"
          titleIcon="eye-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoNotebook(null)}
          onDismiss={() => setInfoNotebook(null)}
        >
          {infoNotebook ? (
            <>
              <AppInfoLine label="Titulo" value={infoNotebook.name} />
              <AppInfoLine label="Descripcion" value={infoNotebook.description || 'Sin descripcion'} />
              <AppInfoLine label="Moneda" value={infoNotebook.currency} />
              <AppInfoLine label="Creacion" value={formatDate(infoNotebook.createdAt)} />
              <AppInfoLine label="Actualizacion" value={formatDate(infoNotebook.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

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

        <AppConfirmDialog
          visible={Boolean(deleteNotebook)}
          title="Eliminar libreta"
          message="Esta accion archivara la libreta y dejara de mostrarse en el listado."
          onCancel={() => setDeleteNotebook(null)}
          onConfirm={confirmDelete}
        />
      </Portal>
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
  const formScrollRef = useRef<ScrollView>(null);

  return (
    <AppFormDialog
      visible={visible}
      title={title}
      contentContainerStyle={styles.form}
      scrollRef={formScrollRef}
      titleIcon={values.icon}
      titleIconColor={values.color}
      onCancel={onCancel}
      onSave={onSave}
    >
            <View style={styles.fieldGroup}>
              <Text style={styles.pickerLabel}>NOMBRE</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej. Casa"
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

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>DESCRIPCION</Text>
              <AppDescriptionInput
                placeholder="Ej. Gastos del hogar"
                value={values.description}
                scrollRef={formScrollRef}
                onChangeText={(description) => onChange({ ...values, description })}
              />
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>ICONO</Text>
              <AppIconPickerGrid
                columns={5}
                icons={iconOptions}
                selectedIcon={values.icon}
                onSelect={(icon) => onChange({ ...values, icon })}
              />
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

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>PREDETERMINADA</Text>
              <AppOptionToggle
                checked={values.isDefault}
                checkedLabel="Predeterminada"
                uncheckedLabel="Usar por defecto"
                onToggle={() => onChange({ ...values, isDefault: !values.isDefault })}
              />
            </View>
    </AppFormDialog>
  );
}

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
      backgroundColor: colors.background,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
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
      lineHeight: typography.headingLineHeight,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 96,
    },
    emptyContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 96,
    },
    notebookRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    notebookContent: {
      flex: 1,
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    notebookPressed: {
      backgroundColor: colors.selected,
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
      gap: 3,
    },
    notebookTitleLine: {
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
      lineHeight: 22,
    },
    notebookMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    notebookActionsButton: {
      width: 36,
      height: 36,
      margin: 0,
      marginRight: spacing.xs,
      borderRadius: radii.navItem,
    },
    separator: {
      height: spacing.sm,
    },
    emptyPanel: {
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
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
    fabWrap: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 88,
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    fab: {
      width: 56,
      height: 56,
      margin: 0,
      opacity: 0.72,
      borderRadius: 28,
    },
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    infoDialogContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    form: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    fieldGroup: {
      gap: spacing.xs,
    },
    pickerGroup: {
      gap: spacing.xs,
    },
    pickerLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
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
  });
}
