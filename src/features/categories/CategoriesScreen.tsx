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
import { AppBottomActionDrawer } from '@/components/ui/AppBottomActionDrawer';
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import {
  CATEGORY_ICON_OPTIONS,
  CATEGORY_SORT_OPTIONS,
  CATEGORY_TYPE_FILTER_OPTIONS,
  CATEGORY_TYPE_OPTIONS,
  getCategoryColorOptions,
  type CategoryIconName,
  type CategorySort,
  type CategoryTypeFilter,
} from '@/constants/categories';
import { categoryRepository, type CategoryInput } from '@/database/repositories/category.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { getMeowneyColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import {
  getCategoryAndChildIds,
  getCategoryDisplayName,
  getPrimaryCategories,
} from '@/utils/categoryHierarchy';
import { formatAppDateTime } from '@/utils/dateFormat';
import type { Category, CategoryType } from './types';

type CategoryFormValues = {
  color: string;
  icon: CategoryIconName;
  name: string;
  parentId: string | null;
  type: CategoryType;
};

type CategoryFilterOption = {
  label: string;
  value: string;
};

function getInitialForm(colors: MeowneyColors): CategoryFormValues {
  return {
    color: colors.cyanSignal,
    icon: 'dots-horizontal-circle-outline',
    name: '',
    parentId: null,
    type: 'expense',
  };
}

function getFormFromCategory(category: Category, colors: MeowneyColors): CategoryFormValues {
  const fallback = getInitialForm(colors);

  return {
    color: category.color ?? fallback.color,
    icon: (category.icon as CategoryIconName | null) ?? fallback.icon,
    name: category.name,
    parentId: category.parentId,
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
    parentId: values.parentId,
  };
}

function formatCategoryType(type: CategoryType) {
  return CATEGORY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Gasto';
}

function summarizeCategorySelection(selectedValues: string[], options: CategoryFilterOption[]) {
  if (selectedValues.length === 0) {
    return 'Todas';
  }

  if (selectedValues.length === 1) {
    return options.find((option) => option.value === selectedValues[0])?.label ?? 'Todas';
  }

  return `${selectedValues.length} seleccionadas`;
}

export function CategoriesScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getCategoryColorOptions(colors), [colors]);
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
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<CategorySort>('nameAsc');
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuCategoryId, setActionMenuCategoryId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const visibleCategories = useMemo(() => {
    const typeFilteredCategories =
      typeFilter === 'all' ? categories : categories.filter((category) => category.type === typeFilter);
    const categoryFilterIds = new Set(
      categoryFilters.flatMap((categoryId) =>
        Array.from(getCategoryAndChildIds(categories, categoryId)),
      ),
    );
    const filteredCategories =
      categoryFilters.length === 0
        ? typeFilteredCategories
        : typeFilteredCategories.filter((category) => categoryFilterIds.has(category.id));

    return [...filteredCategories].sort((first, second) => {
      if (sortOrder === 'updatedDesc') {
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      }

      const comparison = getCategoryDisplayName(categories, first).localeCompare(
        getCategoryDisplayName(categories, second),
        'es',
        { sensitivity: 'base' },
      );
      return sortOrder === 'nameAsc' ? comparison : -comparison;
    });
  }, [categories, categoryFilters, sortOrder, typeFilter]);
  const selectedTypeFilterLabel =
    CATEGORY_TYPE_FILTER_OPTIONS.find((option) => option.value === typeFilter)?.label ?? 'Todos';
  const selectedSortLabel = CATEGORY_SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ?? 'Nombre A-Z';
  const categoryFilterOptions = useMemo(
    () =>
      getPrimaryCategories(categories, typeFilter === 'all' ? undefined : typeFilter).map((category) => ({
        label: getCategoryDisplayName(categories, category),
        value: category.id,
      })),
    [categories, typeFilter],
  );
  const selectedCategoryFilterLabel = summarizeCategorySelection(
    categoryFilters,
    categoryFilterOptions,
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const toggleFilters = useCallback(() => {
    setShowFilters((current) => !current);
  }, []);
  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setCategoryFilters([]);
    setSortOrder('nameAsc');
  }, []);

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
      setSnackbarMessage('Etiqueta actualizada para rastrear mejor.');
    } else {
      categoryRepository.create(toInput(activeNotebookId, formValues));
      setSnackbarMessage('Etiqueta nueva lista para los próximos rastros.');
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
    setSnackbarMessage('Etiqueta archivada fuera de la guarida.');
    reloadCategories();
  };

  const keyExtractor = useCallback((item: Category) => item.id, []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);
  const renderEmptyComponent = useCallback(
    () =>
      isLoading ? (
        <AppLoadingState colors={colors} label="Cargando categorías" />
      ) : (
        <AppEmptyState
          icon="tag-plus-outline"
          title={loadError ? 'No se pudieron cargar las categorías' : 'Aún no hay etiquetas'}
          message={
            loadError
              ? 'Intenta entrar de nuevo o revisa que la base de datos esté disponible.'
              : 'Aquí aparecerán las etiquetas para ordenar tu dinero. Crea categorías como comida, casa, sueldo o transporte para entender en qué se mueve cada peso.'
          }
          style={styles.emptyState}
        />
      ),
    [colors, isLoading, loadError, styles.emptyState],
  );

  const renderCategory = useCallback(({ item }: { item: Category }) => {
    const iconName = (item.icon as CategoryIconName | null) ?? 'dots-horizontal-circle-outline';
    const color = item.color ?? colors.cyanSignal;
    const parentCategory = item.parentId ? categoryById.get(item.parentId) : null;

    return (
      <Surface style={styles.categoryRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver categoría"
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
              {parentCategory ? `Subcategoría de ${parentCategory.name}` : formatCategoryType(item.type)}
            </Text>
          </View>
        </Pressable>

        <AppActionMenu
          visible={actionMenuCategoryId === item.id}
          onDismiss={() => setActionMenuCategoryId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la categoría"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.categoryActionsButton}
              onPress={() => setActionMenuCategoryId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="information-outline"
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
  }, [
    actionMenuCategoryId,
    categoryById,
    colors.cyanSignal,
    colors.mutedText,
    colors.void,
    setInfoCategory,
    styles,
  ]);

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={activeNotebookName ?? stableNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a Mi libreta"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen
        eyebrow="CATEGORIAS"
        helpTitle="¿Para qué sirven las categorías?"
        helpMessage="Las categorías son etiquetas para que Meowney siga el rastro de tus ingresos y gastos. Úsalas para saber en qué se va el dinero: comida, casa, transporte, sueldo u otros movimientos."
      >
        {!activeNotebookId ? (
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para guardar las etiquetas donde corresponde."
            style={styles.missingNotebook}
            action={
            <Button mode="contained" onPress={() => router.replace('/notebooks')}>
              Ir a libretas
            </Button>
            }
          />
        ) : (
          <>
            <View style={styles.filterSection}>
              <View style={styles.filterToggle}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  onPress={toggleFilters}
                  style={({ pressed }) => [styles.filterToggleMain, pressed && styles.filterTogglePressed]}
                >
                  <Text style={styles.filterToggleText}>Filtros</Text>
                  <View style={styles.filterToggleSpacer} />
                </Pressable>
                <IconButton
                  accessibilityLabel="Borrar filtros"
                  icon="filter-remove-outline"
                  iconColor={colors.mutedText}
                  size={18}
                  style={styles.clearFilterButton}
                  onPress={clearFilters}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  onPress={toggleFilters}
                  style={({ pressed }) => [styles.chevronButton, pressed && styles.filterTogglePressed]}
                >
                  <MaterialCommunityIcons name={showFilters ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
                </Pressable>
              </View>

              <AppAnimatedDisclosure
                mode="overlay"
                visible={showFilters}
                maxHeight={320}
                style={styles.filterGroups}
                overlayContentStyle={styles.filterPanel}
              >
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>Tipo</Text>
                  <View style={styles.filterGrid}>
                    <View style={styles.filterControl}>
                      <AppSelectMenu
                        anchor="icon"
                        icon="swap-vertical"
                        label="Tipo"
                        options={CATEGORY_TYPE_FILTER_OPTIONS}
                        selectedLabel={selectedTypeFilterLabel}
                        selectedValue={typeFilter}
                        iconButtonStyle={styles.filterIconButton}
                        menuContentStyle={styles.typeMenuContent}
                        onSelect={setTypeFilter}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>Categoria</Text>
                  <View style={styles.filterGrid}>
                    <CategoryFilterMenu
                      colors={colors}
                      options={categoryFilterOptions}
                      selectedLabel={selectedCategoryFilterLabel}
                      selectedValues={categoryFilters}
                      styles={styles}
                      onChange={setCategoryFilters}
                    />
                  </View>
                </View>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>Orden</Text>
                  <View style={styles.filterGrid}>
                    <View style={styles.filterControl}>
                      <AppSelectMenu
                        anchor="icon"
                        icon="sort"
                        label="Orden"
                        options={CATEGORY_SORT_OPTIONS}
                        selectedLabel={selectedSortLabel}
                        selectedValue={sortOrder}
                        iconButtonStyle={styles.filterIconButton}
                        menuContentStyle={styles.typeMenuContent}
                        onSelect={setSortOrder}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.filterContextSpacer} />
                <Text numberOfLines={1} style={styles.filterContextText}>
                  Vista: {selectedTypeFilterLabel} - Categoria: {selectedCategoryFilterLabel} - {selectedSortLabel}
                </Text>
              </AppAnimatedDisclosure>
            </View>

            <FlatList
              style={styles.list}
              data={isLoading ? [] : visibleCategories}
              keyExtractor={keyExtractor}
              renderItem={renderCategory}
              contentContainerStyle={!isLoading && visibleCategories.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={renderSeparator}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
            />
            <AppBottomActionDrawer style={styles.bottomAction}>
              <AppCatFab
                accessibilityLabel="Agregar categoría"
                label="Agregar categoría"
                style={styles.addButton}
                onPress={openCreate}
              />
            </AppBottomActionDrawer>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoCategory)}
          title="Detalle"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoCategory(null)}
          onDismiss={() => setInfoCategory(null)}
        >
          {infoCategory ? (
            <>
              <AppInfoLine label="Titulo" value={infoCategory.name} />
              <AppInfoLine label="Tipo" value={formatCategoryType(infoCategory.type)} />
              <AppInfoLine
                label="Padre"
                value={
                  infoCategory.parentId
                    ? categories.find((category) => category.id === infoCategory.parentId)?.name ?? 'Sin padre'
                    : 'Sin padre'
                }
              />
              <AppInfoLine label="Creación" value={formatAppDateTime(infoCategory.createdAt)} />
              <AppInfoLine label="Actualización" value={formatAppDateTime(infoCategory.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <CategoryFormDialog
          categories={categories}
          editingCategoryId={editingCategory?.id ?? null}
          styles={styles}
          visible={isCreateOpen || Boolean(editingCategory)}
          title={editingCategory ? 'Editar categoría' : 'Agregar categoría'}
          values={formValues}
          showNameError={showNameError}
          colorOptions={colorOptions}
          onChange={setFormValues}
          onCancel={closeForm}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteCategory)}
          title="Eliminar categoría"
          message="Esta acción archivará la categoría y dejará de mostrarse en el listado."
          onCancel={() => setDeleteCategory(null)}
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

type CategoryFilterMenuProps = {
  colors: MeowneyColors;
  options: CategoryFilterOption[];
  selectedLabel: string;
  selectedValues: string[];
  styles: ReturnType<typeof createStyles>;
  onChange: (values: string[]) => void;
};

function CategoryFilterMenu({
  colors,
  options,
  selectedLabel,
  selectedValues,
  styles,
  onChange,
}: CategoryFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.filterControl}>
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentStyle={styles.typeMenuContent}
        anchor={
          <Tooltip title="Categoria">
            <IconButton
              accessibilityLabel={`Categoria. ${selectedLabel}`}
              icon="shape-outline"
              iconColor={colors.text}
              size={20}
              onPress={() => setIsOpen(true)}
              style={styles.filterIconButton}
            />
          </Tooltip>
        }
      >
        <Menu.Item
          leadingIcon={selectedValues.length === 0 ? 'check' : undefined}
          title="Todas"
          onPress={() => onChange([])}
        />
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            leadingIcon={selectedValues.includes(option.value) ? 'check' : undefined}
            title={option.label}
            onPress={() => {
              onChange(
                selectedValues.includes(option.value)
                  ? selectedValues.filter((value) => value !== option.value)
                  : [...selectedValues, option.value],
              );
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

type CategoryFormDialogProps = {
  categories: Category[];
  colorOptions: string[];
  editingCategoryId: string | null;
  showNameError: boolean;
  styles: ReturnType<typeof createStyles>;
  title: string;
  values: CategoryFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: CategoryFormValues) => void;
  onSave: () => void;
};

function CategoryFormDialog({
  categories,
  colorOptions,
  editingCategoryId,
  showNameError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: CategoryFormDialogProps) {
  const selectedTypeLabel = formatCategoryType(values.type);
  const parentOptions = getPrimaryCategories(categories, values.type).filter(
    (category) => category.id !== editingCategoryId,
  );
  const selectedParent = parentOptions.find((category) => category.id === values.parentId);

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
                placeholder="Ej. Comida, Sueldo o Transporte"
                value={values.name}
                onChangeText={(name) => onChange({ ...values, name })}
                error={showNameError}
              />
              {showNameError ? (
                <HelperText type="error" visible>
                  Escribe un nombre para esta categoría.
                </HelperText>
              ) : null}
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>TIPO</Text>
              <AppSelectMenu
                icon="chevron-down"
                label="Tipo"
                options={CATEGORY_TYPE_OPTIONS}
                selectedLabel={selectedTypeLabel}
                selectedValue={values.type}
                buttonStyle={styles.typeSelect}
                buttonContentStyle={styles.typeSelectContent}
                menuContentStyle={styles.typeMenuContent}
                onSelect={(type) => onChange({ ...values, type, parentId: null })}
              />
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>SUBCATEGORIA DE</Text>
              <AppSelectMenu
                icon="chevron-down"
                label="Subcategoría de"
                options={[
                  { label: 'Ninguna', value: '' },
                  ...parentOptions.map((category) => ({
                    label: getCategoryDisplayName(categories, category),
                    value: category.id,
                  })),
                ]}
                selectedLabel={selectedParent?.name ?? 'Ninguna'}
                selectedValue={values.parentId ?? ''}
                buttonStyle={styles.typeSelect}
                buttonContentStyle={styles.typeSelectContent}
                menuContentStyle={styles.typeMenuContent}
                onSelect={(parentId) => onChange({ ...values, parentId: parentId || null })}
              />
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>ICONO</Text>
              <AppIconPickerGrid
                columns={5}
                icons={CATEGORY_ICON_OPTIONS}
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
    </AppFormDialog>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    filterSection: {
      alignItems: 'stretch',
      marginHorizontal: -spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      position: 'relative',
      zIndex: 6,
    },
    filterToggle: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    filterToggleMain: {
      minHeight: 30,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.button,
      paddingHorizontal: 0,
    },
    clearFilterButton: {
      width: 30,
      height: 30,
      margin: 0,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
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
    filterGroups: {
      position: 'absolute',
      top: 38,
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 7,
    },
    filterPanel: {
      width: '100%',
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    filterGroup: {
      gap: spacing.sm,
    },
    filterGroupLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      paddingHorizontal: spacing.xs,
      textTransform: 'uppercase',
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
    },
    emptyContent: {
      flexGrow: 1,
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
    bottomAction: {
      alignItems: 'center',
      alignSelf: 'stretch',
      marginHorizontal: -spacing.lg,
      marginTop: -spacing.lg,
    },
    addButton: {
      width: '70%',
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
  });
}



