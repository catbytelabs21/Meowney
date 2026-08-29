import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  HelperText,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppActionMenu } from '@/components/ui/AppActionMenu';
import { AppBottomActionDrawer } from '@/components/ui/AppBottomActionDrawer';
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import { budgetRepository, type BudgetInput } from '@/database/repositories/budget.repository';
import { categoryRepository } from '@/database/repositories/category.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { getMeowneyColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import {
  getCategoryDisplayName,
  getPrimaryCategories,
  getSelectedParentCategory,
  getSelectedSubcategory,
  getSubcategories,
} from '@/utils/categoryHierarchy';
import { formatAppDate, formatAppDateTime, isDateKey } from '@/utils/dateFormat';
import { formatMoneyFromCents, parseMoneyToCents } from '@/utils/moneyFormat';
import type { BudgetListItem, BudgetPeriod } from './types';
import type { Category } from '@/features/categories/types';

type BudgetIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type BudgetFormValues = {
  amount: string;
  categoryId: string;
  endDate: string;
  period: BudgetPeriod;
  startDate: string;
};

type BudgetData = {
  budgets: BudgetListItem[];
  categories: Category[];
  currency: string;
};

const periodOptions: { label: string; value: BudgetPeriod }[] = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
  { label: 'Personalizado', value: 'custom' },
];

function todayKey() {
  return toDateKey(new Date());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: BudgetPeriod, baseDateKey = todayKey()) {
  const baseDate = new Date(`${baseDateKey}T12:00:00`);

  if (period === 'weekly') {
    const startDate = new Date(baseDate);
    startDate.setDate(baseDate.getDate() - baseDate.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return { startDate: toDateKey(startDate), endDate: toDateKey(endDate) };
  }

  if (period === 'yearly') {
    return {
      startDate: toDateKey(new Date(baseDate.getFullYear(), 0, 1)),
      endDate: toDateKey(new Date(baseDate.getFullYear(), 11, 31)),
    };
  }

  return {
    startDate: toDateKey(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)),
    endDate: toDateKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)),
  };
}

function getInitialForm(categories: Category[]): BudgetFormValues {
  return {
    amount: '',
    categoryId: categories[0]?.id ?? '',
    endDate: '',
    period: 'monthly',
    startDate: todayKey(),
  };
}

function getFormFromBudget(budget: BudgetListItem): BudgetFormValues {
  return {
    amount: String(budget.amount / 100),
    categoryId: budget.categoryId,
    endDate: budget.endDate ?? '',
    period: budget.period,
    startDate: budget.startDate,
  };
}

function toInput(values: BudgetFormValues): BudgetInput | null {
  const amount = parseMoneyToCents(values.amount);
  const isCustomPeriod = values.period === 'custom';
  const periodRange = isCustomPeriod ? null : getPeriodRange(values.period);
  const startDate = isCustomPeriod ? values.startDate.trim() : periodRange?.startDate ?? todayKey();
  const endDate = isCustomPeriod ? values.endDate.trim() : periodRange?.endDate ?? todayKey();

  if (!amount || !values.categoryId || !isDateKey(startDate) || !isDateKey(endDate)) {
    return null;
  }

  return {
    amount,
    categoryId: values.categoryId,
    endDate,
    period: values.period,
    startDate,
  };
}

function formatPeriod(period: BudgetPeriod) {
  return periodOptions.find((option) => option.value === period)?.label ?? 'Mensual';
}

function getSelectedCategory(categories: Category[], categoryId: string) {
  return categories.find((category) => category.id === categoryId) ?? null;
}

export function BudgetsScreen() {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stableCurrency = useMemo(
    () => (selectedNotebookId ? notebookRepository.getActiveById(selectedNotebookId)?.currency ?? 'MXN' : 'MXN'),
    [selectedNotebookId],
  );
  const stableNotebookName = useMemo(
    () => selectedNotebookName ?? (selectedNotebookId ? notebookRepository.getActiveById(selectedNotebookId)?.name ?? null : null),
    [selectedNotebookId, selectedNotebookName],
  );

  const loadBudgetData = useCallback((): BudgetData => {
    if (!selectedNotebookId) {
      return { budgets: [], categories: [], currency: stableCurrency };
    }

    categoryRepository.seedDefaultCategories(selectedNotebookId);

    return {
      budgets: budgetRepository.listActiveByNotebook(selectedNotebookId),
      categories: categoryRepository
        .listActiveByNotebook(selectedNotebookId)
        .filter((category) => category.type === 'expense'),
      currency: notebookRepository.getActiveById(selectedNotebookId)?.currency ?? stableCurrency,
    };
  }, [selectedNotebookId, stableCurrency]);

  const {
    data,
    error: loadError,
    isLoading,
    reload: reloadBudgets,
  } = useDeferredQuery(loadBudgetData, { budgets: [], categories: [], currency: stableCurrency });
  const [infoBudget, setInfoBudget] = useState<BudgetListItem | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<BudgetListItem | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm([]));
  const [showAmountError, setShowAmountError] = useState(false);
  const [showCategoryError, setShowCategoryError] = useState(false);
  const [showDateError, setShowDateError] = useState(false);
  const [actionMenuBudgetId, setActionMenuBudgetId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const openCreate = () => {
    setFormValues(getInitialForm(data.categories));
    setEditingBudget(null);
    setShowAmountError(false);
    setShowCategoryError(false);
    setShowDateError(false);
    setIsFormOpen(true);
  };

  const openEdit = (budget: BudgetListItem) => {
    setFormValues(getFormFromBudget(budget));
    setEditingBudget(budget);
    setShowAmountError(false);
    setShowCategoryError(false);
    setShowDateError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBudget(null);
    setActionMenuBudgetId(null);
    setShowAmountError(false);
    setShowCategoryError(false);
    setShowDateError(false);
  };

  const saveForm = () => {
    const amount = parseMoneyToCents(formValues.amount);
    const hasCategory = Boolean(formValues.categoryId);
    const isCustomPeriod = formValues.period === 'custom';
    const hasValidDates =
      !isCustomPeriod ||
      (isDateKey(formValues.startDate) && isDateKey(formValues.endDate));
    const input = toInput(formValues);

    setShowAmountError(!amount);
    setShowCategoryError(!hasCategory);
    setShowDateError(!hasValidDates);

    if (!input) {
      return;
    }

    if (editingBudget) {
      budgetRepository.update(editingBudget.id, input);
      setSnackbarMessage('Límite actualizado; Meowney queda atento al gasto.');
    } else {
      budgetRepository.create(input);
      setSnackbarMessage('Límite creado para cuidar esa categoría.');
    }

    closeForm();
    reloadBudgets();
  };

  const confirmDelete = () => {
    if (!deleteBudget) {
      return;
    }

    budgetRepository.archive(deleteBudget.id);
    setDeleteBudget(null);
    setSnackbarMessage('Límite archivado fuera de la guarida.');
    reloadBudgets();
  };

  const renderBudget = ({ item }: { item: BudgetListItem }) => {
    const iconName: BudgetIconName = 'cash-lock';
    const color = item.categoryColor ?? colors.cyanSignal;

    return (
      <Surface style={styles.budgetRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver presupuesto"
          onPress={() => setInfoBudget(item)}
          style={({ pressed }) => [styles.budgetContent, pressed && styles.budgetPressed]}
        >
          <View style={[styles.budgetIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.budgetName}>
              {item.categoryName}
            </Text>
            <Text numberOfLines={1} style={styles.budgetMeta}>
              {formatPeriod(item.period)}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.budgetAmount}>
            {formatMoneyFromCents(item.amount, data.currency)}
          </Text>
        </Pressable>

        <AppActionMenu
          visible={actionMenuBudgetId === item.id}
          onDismiss={() => setActionMenuBudgetId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones del presupuesto"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.budgetActionsButton}
              onPress={() => setActionMenuBudgetId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="information-outline"
            title="Ver"
            onPress={() => {
              setActionMenuBudgetId(null);
              setInfoBudget(item);
            }}
          />
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Editar"
            onPress={() => {
              setActionMenuBudgetId(null);
              openEdit(item);
            }}
          />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuBudgetId(null);
              setDeleteBudget(item);
            }}
          />
        </AppActionMenu>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={stableNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a Mi libreta"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen
        eyebrow="PRESUPUESTOS"
        helpTitle="¿Para qué sirven los presupuestos?"
        helpMessage="Los presupuestos son límites para que Meowney te ayude a no gastar de más en una categoría. Define cuánto quieres permitir y revisa si esa parte de la libreta sigue bajo control."
      >
        {!selectedNotebookId ? (
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para crear límites de gasto."
            style={styles.missingNotebook}
          />
        ) : (
          <>
            <FlatList
              style={styles.list}
              data={isLoading ? [] : data.budgets}
              keyExtractor={(item) => item.id}
              renderItem={renderBudget}
              contentContainerStyle={!isLoading && data.budgets.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                isLoading ? (
                  <AppLoadingState colors={colors} label="Cargando presupuestos" />
                ) : (
                  <AppEmptyState
                    icon="cash-lock"
                    title={loadError ? 'No se pudieron cargar los presupuestos' : 'Aún no hay límites'}
                    message={
                      loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Aquí aparecerán tus límites de gasto por categoría. Crea un presupuesto para saber cuánto puedes gastar y cuándo Meowney debe avisarte que vas cerca del límite.'
                    }
                    style={styles.emptyState}
                  />
                )
              }
              showsVerticalScrollIndicator={false}
            />
            <AppBottomActionDrawer style={styles.bottomAction}>
              <AppCatFab
                accessibilityLabel="Agregar presupuesto"
                disabled={data.categories.length === 0}
                label="Agregar presupuesto"
                style={styles.addButton}
                onPress={openCreate}
              />
            </AppBottomActionDrawer>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoBudget)}
          title="Información"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoBudget(null)}
          onDismiss={() => setInfoBudget(null)}
        >
          {infoBudget ? (
            <>
              <AppInfoLine label="Categoría" value={infoBudget.categoryName} />
              <AppInfoLine label="Monto" value={formatMoneyFromCents(infoBudget.amount, data.currency)} />
              <AppInfoLine label="Periodo" value={formatPeriod(infoBudget.period)} />
              <AppInfoLine label="Inicio" value={formatAppDate(infoBudget.startDate)} />
              <AppInfoLine label="Fin" value={infoBudget.endDate ? formatAppDate(infoBudget.endDate) : 'Sin fecha fin'} />
              <AppInfoLine label="Creación" value={formatAppDateTime(infoBudget.createdAt)} />
              <AppInfoLine label="Actualización" value={formatAppDateTime(infoBudget.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <BudgetFormDialog
          categories={data.categories}
          colors={colors}
          showAmountError={showAmountError}
          showCategoryError={showCategoryError}
          showDateError={showDateError}
          styles={styles}
          title={editingBudget ? 'Editar presupuesto' : 'Agregar presupuesto'}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteBudget)}
          title="Eliminar presupuesto"
          message="Esta acción archivará el presupuesto y dejará de mostrarse."
          confirmLabel="Confirmar"
          onCancel={() => setDeleteBudget(null)}
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

type BudgetFormDialogProps = {
  categories: Category[];
  colors: MeowneyColors;
  showAmountError: boolean;
  showCategoryError: boolean;
  showDateError: boolean;
  styles: ReturnType<typeof createStyles>;
  title: string;
  values: BudgetFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: BudgetFormValues) => void;
  onSave: () => void;
};

function BudgetFormDialog({
  categories,
  colors,
  showAmountError,
  showCategoryError,
  showDateError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: BudgetFormDialogProps) {
  const selectedCategory = getSelectedCategory(categories, values.categoryId);
  const selectedParentCategory = getSelectedParentCategory(categories, values.categoryId);
  const selectedSubcategory = getSelectedSubcategory(categories, values.categoryId);
  const parentOptions = getPrimaryCategories(categories, 'expense');
  const subcategoryOptions = getSubcategories(categories, selectedParentCategory?.id);
  const isCustomPeriod = values.period === 'custom';

  return (
    <AppFormDialog
      visible={visible}
      title={title}
      contentContainerStyle={styles.form}
      onCancel={onCancel}
      onSave={onSave}
    >
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>CATEGORIA</Text>
              <AppSelectMenu
                icon="chevron-down"
                label="Categoria"
                options={parentOptions.map((category) => ({
                  label: getCategoryDisplayName(categories, category),
                  value: category.id,
                }))}
                selectedLabel={selectedParentCategory?.name ?? 'Seleccionar'}
                selectedValue={selectedParentCategory?.id ?? ''}
                buttonStyle={styles.select}
                buttonContentStyle={styles.selectContent}
                menuContentStyle={styles.menuContent}
                onSelect={(categoryId) => onChange({ ...values, categoryId })}
              />
              {showCategoryError ? (
                <HelperText type="error" visible>
                  Elige la categoría que quieres vigilar.
                </HelperText>
              ) : null}
            </View>

            {subcategoryOptions.length > 0 ? (
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>SUBCATEGORIA</Text>
                <AppSelectMenu
                  icon="chevron-down"
                  label="Subcategoría"
                  options={[
                    { label: 'Sin subcategoría', value: selectedParentCategory?.id ?? '' },
                    ...subcategoryOptions.map((category) => ({
                      label: category.name,
                      value: category.id,
                    })),
                  ]}
                  selectedLabel={selectedSubcategory?.name ?? 'Sin subcategoría'}
                  selectedValue={selectedCategory?.id ?? ''}
                  buttonStyle={styles.select}
                  buttonContentStyle={styles.selectContent}
                  menuContentStyle={styles.menuContent}
                  onSelect={(categoryId) => onChange({ ...values, categoryId })}
                />
              </View>
            ) : null}

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>MONTO</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej. 1500"
                keyboardType="decimal-pad"
                value={values.amount}
                onChangeText={(amount) => onChange({ ...values, amount })}
                error={showAmountError}
              />
              {showAmountError ? (
                <HelperText type="error" visible>
                  Escribe el limite que quieres cuidar, mayor a cero.
                </HelperText>
              ) : null}
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>PERIODO</Text>
              <AppSelectMenu
                icon="chevron-down"
                label="Periodo"
                options={periodOptions}
                selectedLabel={formatPeriod(values.period)}
                selectedValue={values.period}
                buttonStyle={styles.select}
                buttonContentStyle={styles.selectContent}
                menuContentStyle={styles.menuContent}
                onSelect={(period) => {
                  const periodRange =
                    period === 'custom'
                      ? { startDate: values.startDate || todayKey(), endDate: values.endDate || todayKey() }
                      : getPeriodRange(period);
                  onChange({
                    ...values,
                    period,
                    startDate: periodRange.startDate,
                    endDate: periodRange.endDate,
                  });
                }}
              />
            </View>

            {isCustomPeriod ? (
              <>
                <View style={styles.pickerGroup}>
                  <Text style={styles.pickerLabel}>FECHA INICIO</Text>
                  <TextInput
                    mode="outlined"
                    value={values.startDate}
                    placeholder="Ej. 2026-08-01"
                    onChangeText={(startDate) => onChange({ ...values, startDate })}
                    error={showDateError}
                  />
                </View>
                <View style={styles.pickerGroup}>
                  <Text style={styles.pickerLabel}>FECHA FIN</Text>
                  <TextInput
                    mode="outlined"
                    value={values.endDate}
                    placeholder="Ej. 2026-08-31"
                    onChangeText={(endDate) => onChange({ ...values, endDate })}
                    error={showDateError}
                  />
                </View>
                {showDateError ? (
                  <HelperText type="error" visible>
                    Usa fechas validas en formato aaaa-mm-dd.
                  </HelperText>
                ) : null}
              </>
            ) : null}
    </AppFormDialog>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
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
    budgetRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    budgetContent: {
      minHeight: 76,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    budgetPressed: {
      backgroundColor: colors.selected,
    },
    budgetIconWrap: {
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
    budgetName: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    budgetAmount: {
      color: colors.text,
      flexShrink: 0,
      minWidth: 92,
      maxWidth: 132,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
      textAlign: 'right',
    },
    budgetMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    budgetActionsButton: {
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
    pickerGroup: {
      gap: spacing.sm,
    },
    pickerLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    select: {
      borderRadius: radii.button,
    },
    selectContent: {
      minHeight: 48,
      flexDirection: 'row-reverse',
    },
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
  });
}



