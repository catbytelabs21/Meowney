import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
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
  Tooltip,
} from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppActionMenu } from '@/components/ui/AppActionMenu';
import { AppAnimatedDisclosure } from '@/components/ui/AppAnimatedDisclosure';
import { AppDraggableFab } from '@/components/ui/AppDraggableFab';
import { AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { categoryRepository, type CategoryInput } from '@/database/repositories/category.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDateTime } from '@/utils/dateFormat';
import type { Category, CategoryType } from './types';

type CategoryIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type CategoryFormValues = {
  color: string;
  icon: CategoryIconName;
  name: string;
  type: CategoryType;
};

type CategoryTypeFilter = 'all' | CategoryType;

type CategorySort = 'nameAsc' | 'nameDesc' | 'updatedDesc';

const iconOptions: CategoryIconName[] = [
  'briefcase-outline',
  'cash-plus',
  'gift-outline',
  'cart-outline',
  'silverware-fork-knife',
  'bus',
  'home-outline',
  'heart-pulse',
  'movie-open-outline',
  'dots-horizontal-circle-outline',
];

const categoryTypeOptions: { label: string; value: CategoryType }[] = [
  { label: 'Ingreso', value: 'income' },
  { label: 'Gasto', value: 'expense' },
];

const categoryTypeFilterOptions: { label: string; value: CategoryTypeFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Ingresos', value: 'income' },
  { label: 'Gastos', value: 'expense' },
];

const categorySortOptions: { label: string; value: CategorySort }[] = [
  { label: 'Nombre A-Z', value: 'nameAsc' },
  { label: 'Nombre Z-A', value: 'nameDesc' },
  { label: 'Recientes', value: 'updatedDesc' },
];

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

function getInitialForm(colors: MeowneyColors): CategoryFormValues {
  return {
    color: colors.cyanSignal,
    icon: 'dots-horizontal-circle-outline',
    name: '',
    type: 'expense',
  };
}

function getFormFromCategory(category: Category, colors: MeowneyColors): CategoryFormValues {
  const fallback = getInitialForm(colors);

  return {
    color: category.color ?? fallback.color,
    icon: (category.icon as CategoryIconName | null) ?? fallback.icon,
    name: category.name,
    type: category.type,
  };
}

function toInput(notebookId: string, values: CategoryFormValues): CategoryInput {
  return {
    notebookId,
    name: values.name.trim(),
    type: values.type,
    icon: values.icon,
    color: values.color,
    parentId: null,
  };
}

function formatDate(value: string) {
  return formatAppDateTime(value);
}

function formatCategoryType(type: CategoryType) {
  return categoryTypeOptions.find((option) => option.value === type)?.label ?? 'Gasto';
}

export function CategoriesScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getColorOptions(colors), [colors]);
  const stableNotebookName = useMemo(() => {
    if (selectedNotebookName) {
      return selectedNotebookName;
    }

    return activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.name ?? null : null;
  }, [activeNotebookId, selectedNotebookName]);

  const loadCategoriesData = useCallback(() => {
    if (!activeNotebookId) {
      return { categories: [], notebookName: stableNotebookName };
    }

    categoryRepository.seedDefaultCategories(activeNotebookId);

    return {
      categories: categoryRepository.listActiveByNotebook(activeNotebookId),
      notebookName: stableNotebookName,
    };
  }, [activeNotebookId, stableNotebookName]);
  const {
    data: categoriesData,
    error: loadError,
    isLoading,
    reload: reloadCategories,
  } = useDeferredQuery(loadCategoriesData, { categories: [], notebookName: stableNotebookName });
  const { categories, notebookName: activeNotebookName } = categoriesData;
  const [infoCategory, setInfoCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<CategorySort>('nameAsc');
  const [showFilters, setShowFilters] = useState(true);
  const [actionMenuCategoryId, setActionMenuCategoryId] = useState<string | null>(null);
  const visibleCategories = useMemo(() => {
    const filteredCategories =
      typeFilter === 'all' ? categories : categories.filter((category) => category.type === typeFilter);

    return [...filteredCategories].sort((first, second) => {
      if (sortOrder === 'updatedDesc') {
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      }

      const comparison = first.name.localeCompare(second.name, 'es', { sensitivity: 'base' });
      return sortOrder === 'nameAsc' ? comparison : -comparison;
    });
  }, [categories, sortOrder, typeFilter]);
  const selectedTypeFilterLabel =
    categoryTypeFilterOptions.find((option) => option.value === typeFilter)?.label ?? 'Todos';
  const selectedSortLabel = categorySortOptions.find((option) => option.value === sortOrder)?.label ?? 'Nombre A-Z';
  const toggleFilters = () => {
    setShowFilters((current) => !current);
  };

  useEffect(() => {
    if (routeNotebookId && routeNotebookId !== selectedNotebookId) {
      setSelectedNotebookId(routeNotebookId, notebookRepository.getActiveById(routeNotebookId)?.name ?? null);
    }
  }, [routeNotebookId, selectedNotebookId, setSelectedNotebookId]);

  const openCreate = () => {
    setFormValues(getInitialForm(colors));
    setShowNameError(false);
    setIsCreateOpen(true);
  };

  const openEdit = (category: Category) => {
    setFormValues(getFormFromCategory(category, colors));
    setShowNameError(false);
    setEditingCategory(category);
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingCategory(null);
    setShowNameError(false);
    setActionMenuCategoryId(null);
  };

  const saveForm = () => {
    if (!activeNotebookId) {
      return;
    }

    if (!formValues.name.trim()) {
      setShowNameError(true);
      return;
    }

    if (editingCategory) {
      categoryRepository.update(editingCategory.id, toInput(activeNotebookId, formValues));
    } else {
      categoryRepository.create(toInput(activeNotebookId, formValues));
    }

    closeForm();
    reloadCategories();
  };

  const confirmDelete = () => {
    if (!deleteCategory || !activeNotebookId) {
      return;
    }

    categoryRepository.archive(deleteCategory.id, activeNotebookId);
    setDeleteCategory(null);
    reloadCategories();
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const iconName = (item.icon as CategoryIconName | null) ?? 'dots-horizontal-circle-outline';
    const color = item.color ?? colors.cyanSignal;

    return (
      <Surface style={styles.categoryRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver categoria"
          onPress={() => setInfoCategory(item)}
          style={({ pressed }) => [styles.categoryContent, pressed && styles.categoryPressed]}
        >
          <View style={[styles.categoryIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.categoryName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.categoryMeta}>
              {formatCategoryType(item.type)}
            </Text>
          </View>
        </Pressable>

        <AppActionMenu
          visible={actionMenuCategoryId === item.id}
          onDismiss={() => setActionMenuCategoryId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la categoria"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.categoryActionsButton}
              onPress={() => setActionMenuCategoryId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="eye-outline"
            title="Ver"
            onPress={() => {
              setActionMenuCategoryId(null);
              setInfoCategory(item);
            }}
          />
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Editar"
            onPress={() => {
              setActionMenuCategoryId(null);
              openEdit(item);
            }}
          />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuCategoryId(null);
              setDeleteCategory(item);
            }}
          />
        </AppActionMenu>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={activeNotebookName ?? stableNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a mas"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen eyebrow="CATEGORIAS" title="Ingresos y gastos">
        {!activeNotebookId ? (
          <Surface style={styles.missingNotebook} elevation={0}>
            <MaterialCommunityIcons name="book-alert-outline" size={36} color={colors.mutedText} />
            <Text style={styles.emptyTitle}>Selecciona una libreta</Text>
            <Text style={styles.emptyText}>
              Entra primero a una libreta para que las categorias se guarden en el lugar correcto.
            </Text>
            <Button mode="contained" onPress={() => router.replace('/notebooks')}>
              Ir a libretas
            </Button>
          </Surface>
        ) : (
          <>
            <View style={styles.filterSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                onPress={toggleFilters}
                style={({ pressed }) => [styles.filterToggle, pressed && styles.filterTogglePressed]}
              >
                <Text style={styles.filterToggleText}>Filtros</Text>
                <View style={styles.filterToggleSpacer} />
                <View style={styles.chevronButton}>
                  <MaterialCommunityIcons name={showFilters ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
                </View>
              </Pressable>

              <AppAnimatedDisclosure visible={showFilters} maxHeight={132} style={styles.filterGrid}>
                <View style={styles.filterControl}>
                  <CategoryListMenu
                    colors={colors}
                    icon="swap-vertical"
                    label="Tipo"
                    options={categoryTypeFilterOptions}
                    selectedLabel={selectedTypeFilterLabel}
                    selectedValue={typeFilter}
                    styles={styles}
                    onSelect={setTypeFilter}
                  />
                </View>
                <View style={styles.filterControl}>
                  <CategoryListMenu
                    colors={colors}
                    icon="sort"
                    label="Orden"
                    options={categorySortOptions}
                    selectedLabel={selectedSortLabel}
                    selectedValue={sortOrder}
                    styles={styles}
                    onSelect={setSortOrder}
                  />
                </View>
              </AppAnimatedDisclosure>
              <View style={styles.filterContextSpacer} />
              <Text numberOfLines={1} style={styles.filterContextText}>
                Vista: {selectedTypeFilterLabel} · {selectedSortLabel}
              </Text>
            </View>

            <FlatList
              style={styles.list}
              data={isLoading ? [] : visibleCategories}
              keyExtractor={(item) => item.id}
              renderItem={renderCategory}
              contentContainerStyle={!isLoading && visibleCategories.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                isLoading ? (
                  <AppLoadingState colors={colors} label="Cargando categorias" />
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="tag-plus-outline" size={36} color={colors.mutedText} />
                    <Text style={styles.emptyTitle}>
                      {loadError ? 'No se pudieron cargar las categorias' : 'Aun no hay categorias'}
                    </Text>
                    <Text style={styles.emptyText}>
                      {loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Crea categorias para clasificar tus ingresos y gastos.'}
                    </Text>
                  </View>
                )
              }
              showsVerticalScrollIndicator={false}
            />
            <AppDraggableFab style={styles.fabWrap}>
              <IconButton
                accessibilityLabel="Nueva categoria"
                icon="plus"
                mode="contained"
                iconColor={colors.onPrimary}
                containerColor={colors.primary}
                size={28}
                style={styles.fab}
                onPress={openCreate}
              />
            </AppDraggableFab>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoCategory)}
          title="Detalle"
          titleIcon="eye-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoCategory(null)}
          onDismiss={() => setInfoCategory(null)}
        >
          {infoCategory ? (
            <>
              <AppInfoLine label="Titulo" value={infoCategory.name} />
              <AppInfoLine label="Tipo" value={formatCategoryType(infoCategory.type)} />
              <AppInfoLine label="Creacion" value={formatDate(infoCategory.createdAt)} />
              <AppInfoLine label="Actualizacion" value={formatDate(infoCategory.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <CategoryFormDialog
          colors={colors}
          styles={styles}
          visible={isCreateOpen || Boolean(editingCategory)}
          title={editingCategory ? 'Editar categoria' : 'Nueva categoria'}
          values={formValues}
          showNameError={showNameError}
          colorOptions={colorOptions}
          onChange={setFormValues}
          onCancel={closeForm}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteCategory)}
          title="Eliminar categoria"
          message="Esta accion archivara la categoria y dejara de mostrarse en el listado."
          onCancel={() => setDeleteCategory(null)}
          onConfirm={confirmDelete}
        />
      </Portal>
    </View>
  );
}

type CategoryFormDialogProps = {
  colors: MeowneyColors;
  colorOptions: string[];
  showNameError: boolean;
  styles: ReturnType<typeof createStyles>;
  title: string;
  values: CategoryFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: CategoryFormValues) => void;
  onSave: () => void;
};

type CategoryListMenuProps<Value extends string> = {
  colors: MeowneyColors;
  icon: CategoryIconName;
  label: string;
  options: { label: string; value: Value }[];
  selectedLabel: string;
  selectedValue: Value;
  styles: ReturnType<typeof createStyles>;
  onSelect: (value: Value) => void;
};

function CategoryListMenu<Value extends string>({
  colors,
  icon,
  label,
  options,
  selectedLabel,
  selectedValue,
  styles,
  onSelect,
}: CategoryListMenuProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Menu
      visible={isOpen}
      onDismiss={() => setIsOpen(false)}
      contentStyle={styles.typeMenuContent}
      anchor={
        <Tooltip title={label}>
          <IconButton
            accessibilityLabel={`${label}. ${selectedLabel}`}
            icon={icon}
            iconColor={colors.text}
            size={20}
            onPress={() => setIsOpen(true)}
            style={styles.filterIconButton}
          />
        </Tooltip>
      }
    >
      {options.map((option) => (
        <Menu.Item
          key={option.value}
          leadingIcon={selectedValue === option.value ? 'check' : undefined}
          title={option.label}
          onPress={() => {
            onSelect(option.value);
            setIsOpen(false);
          }}
        />
      ))}
    </Menu>
  );
}

function CategoryFormDialog({
  colors,
  colorOptions,
  showNameError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: CategoryFormDialogProps) {
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const selectedTypeLabel = formatCategoryType(values.type);

  return (
    <AppFormDialog
      visible={visible}
      title={title}
      contentContainerStyle={styles.form}
      onCancel={onCancel}
      onSave={onSave}
    >
            <View style={styles.fieldGroup}>
              <Text style={styles.pickerLabel}>NOMBRE</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej. Comida"
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
              <Text style={styles.pickerLabel}>TIPO</Text>
              <Menu
                visible={isTypeMenuOpen}
                onDismiss={() => setIsTypeMenuOpen(false)}
                contentStyle={styles.typeMenuContent}
                anchor={
                  <Button
                    mode="outlined"
                    icon="chevron-down"
                    onPress={() => setIsTypeMenuOpen(true)}
                    style={styles.typeSelect}
                    contentStyle={styles.typeSelectContent}
                    textColor={colors.text}
                  >
                    {selectedTypeLabel}
                  </Button>
                }
              >
                {categoryTypeOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    title={option.label}
                    onPress={() => {
                      onChange({ ...values, type: option.value });
                      setIsTypeMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
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
                      {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.void} /> : null}
                    </Pressable>
                  );
                })}
              </View>
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
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
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
      lineHeight: typography.headingLineHeight,
    },
    filterSection: {
      alignItems: 'stretch',
      gap: 2,
    },
    filterToggle: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.button,
    },
    filterTogglePressed: {
      backgroundColor: colors.selected,
    },
    filterToggleText: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    filterToggleSpacer: {
      flex: 1,
    },
    chevronButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    filterContextSpacer: {
      height: spacing.sm,
    },
    filterContextText: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      paddingHorizontal: spacing.xs,
    },
    filterGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
    },
    filterControl: {
      flexShrink: 0,
    },
    filterIconButton: {
      width: 42,
      height: 42,
      margin: 0,
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 96,
    },
    emptyContent: {
      flexGrow: 1,
      paddingBottom: 96,
    },
    categoryRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    categoryContent: {
      flex: 1,
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    categoryPressed: {
      backgroundColor: colors.selected,
    },
    categoryIconWrap: {
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
    categoryName: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    categoryMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    categoryActionsButton: {
      width: 36,
      height: 36,
      margin: 0,
      marginRight: spacing.xs,
      borderRadius: radii.navItem,
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
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    missingNotebook: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
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
      gap: spacing.md,
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
      gap: spacing.ms,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    fieldGroup: {
      gap: spacing.sm,
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
    typeSelect: {
      borderRadius: radii.button,
    },
    typeSelectContent: {
      minHeight: 48,
      flexDirection: 'row-reverse',
    },
    typeMenuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
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
  });
}


