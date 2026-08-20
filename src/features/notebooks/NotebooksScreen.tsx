import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppDraggableFab } from '@/components/ui/AppDraggableFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppDescriptionInput, AppIconPickerGrid, AppInfoLine, AppOptionToggle } from '@/components/ui/AppFormFields';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import {
  NOTEBOOK_CURRENCY_OPTIONS,
  NOTEBOOK_ICON_OPTIONS,
  getNotebookColorOptions,
  type NotebookIconName,
} from '@/constants/notebooks';
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
  const { openDefaultNotebook } = useLocalSearchParams<{ openDefaultNotebook?: string | string[] }>();
  const clearSelectedNotebookId = useAppStore((state) => state.clearSelectedNotebookId);
  const dataResetVersion = useAppStore((state) => state.dataResetVersion);
  const launchPreference = useAppStore((state) => state.launchPreference);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getNotebookColorOptions(colors), [colors]);
  const shouldOpenDefaultNotebook =
    openDefaultNotebook === '1' ||
    (Array.isArray(openDefaultNotebook) && openDefaultNotebook.includes('1'));

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
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
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
    if (isLoading || didHandleInitialLaunch.current || !shouldOpenDefaultNotebook) {
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
  }, [isLoading, launchPreference, notebookEntryPath, notebooks, setSelectedNotebookId, shouldOpenDefaultNotebook]);

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
      setSnackbarMessage('Guarida actualizada y lista para seguir cuidando tus rastros.');
    } else {
      const createdNotebook = notebookRepository.create(toInput(formValues));
      savedNotebookId = createdNotebook.id;
      categoryRepository.seedDefaultCategories(createdNotebook.id);
      setSnackbarMessage('Nueva guarida lista para que Meowney la vigile.');
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
    setSnackbarMessage('Guarida archivada fuera del mapa.');
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
            router.push({ pathname: notebookEntryPath, params: { notebookId: item.id } });
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
            ListHeaderComponent={<AppScreenHeader eyebrow="LIBRETAS" title="Guaridas financieras" withBottomGap />}
            contentContainerStyle={!isLoading && notebooks.length ? styles.listContent : styles.emptyContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              isLoading ? (
                <Surface style={styles.emptyPanel} elevation={0}>
                  <AppLoadingState colors={colors} label="Cargando libretas" />
                </Surface>
              ) : (
                  <AppEmptyState
                    icon="notebook-plus-outline"
                    title={loadError ? 'No se pudieron cargar las libretas' : 'Aun no hay guaridas'}
                    message={
                      loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Crea una libreta para que Meowney cuide cuentas, categorias y rastros por contexto.'
                    }
                    style={styles.emptyPanel}
                  />
              )
            }
            showsVerticalScrollIndicator={false}
          />
          <AppDraggableFab style={styles.fabWrap}>
            <AppCatFab
              accessibilityLabel="Nueva libreta"
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

      <AppMeowneySnackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
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
                icons={NOTEBOOK_ICON_OPTIONS}
                selectedIcon={values.icon}
                onSelect={(icon) => onChange({ ...values, icon })}
              />
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>COLOR</Text>
              <AppColorPicker
                colors={colorOptions}
                selectedColor={values.color}
                onSelect={(color) => onChange({ ...values, color })}
              />
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>MONEDA</Text>
              <View style={styles.currencyRow}>
                {NOTEBOOK_CURRENCY_OPTIONS.map((currency) => {
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
    fabWrap: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 88,
      alignItems: 'flex-end',
      gap: spacing.sm,
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
