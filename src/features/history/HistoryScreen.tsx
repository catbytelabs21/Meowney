import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Menu,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAnimatedDisclosure } from '@/components/ui/AppAnimatedDisclosure';
import { AppDateInput, AppDatePickerDialog, toDateKey } from '@/components/ui/AppDatePicker';
import { AppScreenHeader } from '@/components/layout/AppScreen';
import { AppDescriptionInput, AppInfoLine, AppReadOnlyRow } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { accountRepository } from '@/database/repositories/account.repository';
import { budgetRepository } from '@/database/repositories/budget.repository';
import { categoryRepository } from '@/database/repositories/category.repository';
import { historyRepository } from '@/database/repositories/history.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { transactionRepository, type TransactionInput } from '@/database/repositories/transaction.repository';
import { transferRepository, type TransferInput } from '@/database/repositories/transfer.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDate } from '@/utils/dateFormat';
import type { Account } from '@/features/accounts/types';
import type { BudgetListItem } from '@/features/budgets/types';
import type { Category } from '@/features/categories/types';
import type {
  HistoryAccountBalance,
  HistoryCategoryFilter,
  HistoryMovementItem,
} from './types';
import type { MovementType, TransactionType } from '@/features/transactions/types';

type HistorySection = 'balance' | 'movements';

type HistoryScreenProps = {
  section?: HistorySection;
};

type HistoryData = {
  accounts: Account[];
  balances: HistoryAccountBalance[];
  budgets: BudgetListItem[];
  categoriesRaw: Category[];
  categories: HistoryCategoryFilter[];
  currency: string;
  movements: HistoryMovementItem[];
};

type MovementFormValues = {
  accountId: string;
  amount: string;
  budgetId: string;
  categoryId: string;
  dateKey: string;
  description: string;
  fromAccountId: string;
  toAccountId: string;
};

type MovementListRow =
  | {
      count: number;
      id: string;
      label: string;
      type: 'month';
    }
  | {
      id: string;
      movement: HistoryMovementItem;
      type: 'movement';
    };

function toDateTime(dateKey: string) {
  return `${dateKey}T12:00:00.000Z`;
}

function formatMovementTitleDate(value: string) {
  return formatAppDate(value);
}

function formatMovementMonth(value: string) {
  const label = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', {
    currency,
    style: 'currency',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatAccountCount(count: number) {
  return count === 1 ? '1 cuenta incluida' : `${count} cuentas incluidas`;
}

function parseAmount(value: string) {
  const normalized = value.replace(',', '.').trim();
  const number = Number(normalized);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Math.round(number * 100);
}

function getSignedAmount(type: MovementType, amount: number, currency: string) {
  if (type === 'income') {
    return `+${formatAmount(amount, currency)}`;
  }

  if (type === 'expense') {
    return `-${formatAmount(amount, currency)}`;
  }

  return formatAmount(amount, currency);
}

function getMovementColor(colors: MeowneyColors, type: MovementType) {
  if (type === 'income') {
    return colors.success;
  }

  if (type === 'expense') {
    return colors.error;
  }

  return colors.cyanSignal;
}

function getInitialForm(accounts: Account[], categories: Category[], mode: MovementType, dateKey: string): MovementFormValues {
  const categoryType = mode === 'income' ? 'income' : 'expense';
  const firstCategory = categories.find((category) => category.type === categoryType);

  return {
    accountId: accounts[0]?.id ?? '',
    amount: '',
    budgetId: '',
    categoryId: mode === 'transfer' ? '' : firstCategory?.id ?? '',
    dateKey,
    description: '',
    fromAccountId: accounts[0]?.id ?? '',
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? '',
  };
}

function summarizeSelection(selectedValues: string[], emptyLabel: string, options: FilterOption[]) {
  if (selectedValues.length === 0) {
    return emptyLabel;
  }

  if (selectedValues.length === 1) {
    return options.find((option) => option.value === selectedValues[0])?.label ?? emptyLabel;
  }

  return `${selectedValues.length} seleccionados`;
}

function filterMovements(
  movements: HistoryMovementItem[],
  typeFilters: MovementType[],
  accountFilters: string[],
  categoryFilters: string[],
) {
  return movements.filter((movement) => {
    const matchesType = typeFilters.length === 0 || typeFilters.includes(movement.type);
    const matchesAccount =
      accountFilters.length === 0 ||
      accountFilters.includes(movement.accountId) ||
      (movement.toAccountId ? accountFilters.includes(movement.toAccountId) : false);
    const matchesCategory = categoryFilters.length === 0 || (movement.categoryId ? categoryFilters.includes(movement.categoryId) : false);
    return matchesType && matchesAccount && matchesCategory;
  });
}

function groupMovementsByMonth(movements: HistoryMovementItem[]): MovementListRow[] {
  const rows: MovementListRow[] = [];
  const seenMonths = new Set<string>();
  const monthCounts = movements.reduce<Record<string, number>>((counts, movement) => {
    const monthKey = movement.occurredAt.slice(0, 7);
    counts[monthKey] = (counts[monthKey] ?? 0) + 1;
    return counts;
  }, {});

  movements.forEach((movement) => {
    const monthKey = movement.occurredAt.slice(0, 7);

    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      rows.push({
        count: monthCounts[monthKey] ?? 0,
        id: `month_${monthKey}`,
        label: formatMovementMonth(movement.occurredAt),
        type: 'month',
      });
    }

    rows.push({
      id: `${movement.type}_${movement.id}`,
      movement,
      type: 'movement',
    });
  });

  return rows;
}

function getMovementAccountLabel(movement: HistoryMovementItem) {
  if (movement.toAccountName) {
    return `${movement.accountName} -> ${movement.toAccountName}`;
  }

  return movement.accountName;
}

function getMovementLabel(type: MovementType) {
  if (type === 'income') {
    return 'Ingreso';
  }

  if (type === 'expense') {
    return 'Gasto';
  }

  return 'Transferencia';
}

function getMovementIcon(type: MovementType): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type === 'income') {
    return 'arrow-down-circle-outline';
  }

  if (type === 'expense') {
    return 'arrow-up-circle-outline';
  }

  return 'swap-horizontal-circle-outline';
}

export function HistoryScreen({ section }: HistoryScreenProps) {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedSection, setSelectedSection] = useState<HistorySection>('balance');
  const [selectedDate, setSelectedDate] = useState(today);
  const [typeFilters, setTypeFilters] = useState<MovementType[]>([]);
  const [accountFilters, setAccountFilters] = useState<string[]>([]);
  const [balanceAccountFilters, setBalanceAccountFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [isCreateMenuMounted, setIsCreateMenuMounted] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState<MovementType>('expense');
  const [editingMovement, setEditingMovement] = useState<HistoryMovementItem | null>(null);
  const [formValues, setFormValues] = useState<MovementFormValues>(() => getInitialForm([], [], 'expense', today));
  const [infoMovement, setInfoMovement] = useState<HistoryMovementItem | null>(null);
  const [isBalanceDatePickerOpen, setIsBalanceDatePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteMovement, setDeleteMovement] = useState<HistoryMovementItem | null>(null);
  const [actionMenuMovementId, setActionMenuMovementId] = useState<string | null>(null);
  const [showAccountError, setShowAccountError] = useState(false);
  const [showAmountError, setShowAmountError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBalanceFilters, setShowBalanceFilters] = useState(false);
  const createMenuProgress = useRef(new Animated.Value(0)).current;

  const loadHistoryData = useCallback((): HistoryData => {
    if (!selectedNotebookId) {
      return {
        accounts: [],
        balances: [],
        budgets: [],
        categories: [],
        categoriesRaw: [],
        currency: 'MXN',
        movements: [],
      };
    }

    const notebook = notebookRepository.getActiveById(selectedNotebookId);
    categoryRepository.seedDefaultCategories(selectedNotebookId);

    return {
      accounts: accountRepository.listActiveByNotebook(selectedNotebookId),
      balances: historyRepository.getBalancesByNotebookAtDate(selectedNotebookId, selectedDate),
      budgets: budgetRepository.listActiveByNotebook(selectedNotebookId),
      categories: historyRepository.listCategoriesByNotebook(selectedNotebookId),
      categoriesRaw: categoryRepository.listActiveByNotebook(selectedNotebookId),
      currency: notebook?.currency ?? 'MXN',
      movements: historyRepository.listMovementsByNotebook(selectedNotebookId),
    };
  }, [selectedDate, selectedNotebookId]);

  const {
    data,
    isLoading,
    reload,
  } = useDeferredQuery(loadHistoryData, {
    accounts: [],
    balances: [],
    budgets: [],
    categories: [],
    categoriesRaw: [],
    currency: 'MXN',
    movements: [],
  });
  const [hasLoadedHistoryOnce, setHasLoadedHistoryOnce] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    if (!isLoading) {
      setHasLoadedHistoryOnce(true);
    }
  }, [isLoading]);

  const visibleBalances = useMemo(
    () =>
      balanceAccountFilters.length === 0
        ? data.balances
        : data.balances.filter((account) => balanceAccountFilters.includes(account.accountId)),
    [balanceAccountFilters, data.balances],
  );
  const totalBalance = useMemo(
    () => visibleBalances.reduce((total, account) => total + account.balance, 0),
    [visibleBalances],
  );
  const visibleMovements = useMemo(
    () => filterMovements(data.movements, typeFilters, accountFilters, categoryFilters),
    [accountFilters, categoryFilters, data.movements, typeFilters],
  );
  const movementRows = useMemo(() => groupMovementsByMonth(visibleMovements), [visibleMovements]);
  const typeOptions = useMemo(
    () => [
      { label: 'Ingresos', value: 'income' },
      { label: 'Gastos', value: 'expense' },
      { label: 'Transferencias', value: 'transfer' },
    ],
    [],
  );
  const accountOptions = useMemo(
    () => data.accounts.map((account) => ({ label: account.name, value: account.id })),
    [data.accounts],
  );
  const categoryOptions = useMemo(
    () => data.categories.map((category) => ({ label: category.name, value: category.id })),
    [data.categories],
  );
  const selectedTypeLabel = summarizeSelection(typeFilters, 'Todos', typeOptions);
  const selectedAccountLabel = summarizeSelection(accountFilters, 'Todas las cuentas', accountOptions);
  const selectedBalanceAccountLabel = summarizeSelection(balanceAccountFilters, 'Todas las cuentas', accountOptions);
  const selectedCategoryLabel = summarizeSelection(categoryFilters, 'Todas las categorias', categoryOptions);
  const activeSection = section ?? selectedSection;
  const showSectionPicker = !section;
  const createMenuAnimatedStyle = {
    opacity: createMenuProgress,
    transform: [
      {
        translateX: createMenuProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [38, 0],
        }),
      },
      {
        translateY: createMenuProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [64, 0],
        }),
      },
      {
        scale: createMenuProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.24, 1],
        }),
      },
    ],
  };
  const createButtonIconAnimatedStyle = {
    transform: [
      {
        rotate: createMenuProgress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };
  const updateSelectedDate = (dateKey: string) => {
    setSelectedDate(dateKey);
  };

  const openCreateMenu = () => {
    setIsCreateMenuMounted(true);
    setCreateMenuOpen(true);
    createMenuProgress.setValue(0);
    Animated.timing(createMenuProgress, {
      toValue: 1,
      duration: motion.createMenuOpenDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeCreateMenu = () => {
    Animated.timing(createMenuProgress, {
      toValue: 0,
      duration: motion.createMenuCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCreateMenuOpen(false);
        setIsCreateMenuMounted(false);
      }
    });
  };

  const openCreateForm = (mode: MovementType) => {
    setCreateMode(mode);
    setFormValues(getInitialForm(data.accounts, data.categoriesRaw, mode, today));
    setEditingMovement(null);
    closeCreateMenu();
    setShowAmountError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setIsDatePickerOpen(false);
    setEditingMovement(null);
    setShowAmountError(false);
    setShowAccountError(false);
  };

  const openEditForm = (movement: HistoryMovementItem) => {
    setActionMenuMovementId(null);
    setCreateMode(movement.type);

    if (movement.type === 'transfer') {
      const transfer = transferRepository.getActiveById(movement.id);
      if (!transfer) {
        return;
      }
      const dateKey = transfer.transferAt.slice(0, 10);
      setFormValues({
        accountId: '',
        amount: String(transfer.amount / 100),
        budgetId: '',
        categoryId: '',
        dateKey,
        description: transfer.description ?? '',
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
      });
    } else {
      const transaction = transactionRepository.getActiveById(movement.id);
      if (!transaction) {
        return;
      }
      const dateKey = transaction.transactionAt.slice(0, 10);
      setFormValues({
        accountId: transaction.accountId,
        amount: String(transaction.amount / 100),
        budgetId: '',
        categoryId: transaction.categoryId,
        dateKey,
        description: transaction.description ?? '',
        fromAccountId: data.accounts[0]?.id ?? '',
        toAccountId: data.accounts[1]?.id ?? data.accounts[0]?.id ?? '',
      });
    }

    setEditingMovement(movement);
    setShowAmountError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const saveForm = () => {
    if (!selectedNotebookId) {
      return;
    }

    const amount = parseAmount(formValues.amount);
    const isTransfer = createMode === 'transfer';
    const hasAccount = isTransfer
      ? Boolean(formValues.fromAccountId && formValues.toAccountId && formValues.fromAccountId !== formValues.toAccountId)
      : Boolean(formValues.accountId);
    const hasCategory = isTransfer || Boolean(formValues.categoryId);

    setShowAmountError(!amount);
    setShowAccountError(!hasAccount || !hasCategory);

    if (!amount || !hasAccount || !hasCategory) {
      return;
    }

    if (isTransfer) {
      const input: TransferInput = {
        amount,
        description: formValues.description.trim() || null,
        fromAccountId: formValues.fromAccountId,
        toAccountId: formValues.toAccountId,
        transferAt: toDateTime(formValues.dateKey),
      };

      if (editingMovement?.type === 'transfer') {
        transferRepository.update(editingMovement.id, input);
      } else {
        transferRepository.create(input);
      }
    } else {
      const input: TransactionInput = {
        accountId: formValues.accountId,
        amount,
        categoryId: formValues.categoryId,
        description: formValues.description.trim() || null,
        transactionAt: toDateTime(formValues.dateKey),
        type: createMode as TransactionType,
      };

      if (editingMovement && editingMovement.type !== 'transfer') {
        transactionRepository.update(editingMovement.id, input);
      } else {
        transactionRepository.create(input);
      }
    }

    closeForm();
    reload();
  };

  const confirmDelete = () => {
    if (!deleteMovement) {
      return;
    }

    if (deleteMovement.type === 'transfer') {
      transferRepository.archive(deleteMovement.id);
    } else {
      transactionRepository.archive(deleteMovement.id);
    }

    setDeleteMovement(null);
    setInfoMovement(null);
    reload();
  };

  const renderMovementRow = ({ item, index }: { index: number; item: MovementListRow }) => {
    if (item.type === 'month') {
      return (
        <View style={[styles.monthGroupHeader, index === 0 ? styles.monthGroupHeaderFirst : null]}>
          <Text style={styles.monthGroupTitle}>{item.label}</Text>
          <Text style={styles.monthGroupCount}>{item.count}</Text>
        </View>
      );
    }

    const { movement } = item;
    const accountLabel = getMovementAccountLabel(movement);
    const categoryLabel = movement.categoryName ?? 'Transferencia';

    return (
      <Surface style={styles.movementRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver movimiento"
          onPress={() => setInfoMovement(movement)}
          style={({ pressed }) => [styles.movementContent, pressed ? styles.movementPressed : null]}
        >
          <View style={styles.movementCopy}>
            <Text numberOfLines={1} style={styles.movementDateLabel}>
              {formatMovementTitleDate(movement.occurredAt)}
            </Text>
            <View style={styles.movementMetaLine}>
              <Text numberOfLines={1} style={[styles.movementMeta, styles.movementAccountText]}>
                {accountLabel}
              </Text>
              <View style={styles.movementMetaDot} />
              <Text numberOfLines={1} style={[styles.movementMeta, styles.movementCategoryText]}>
                {categoryLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.amount, { color: getMovementColor(colors, movement.type) }]}>
            {getSignedAmount(movement.type, movement.amount, data.currency)}
          </Text>
        </Pressable>
        <Menu
          visible={actionMenuMovementId === movement.id}
          onDismiss={() => setActionMenuMovementId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones del movimiento"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.movementActionsButton}
              onPress={() => setActionMenuMovementId(movement.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="eye-outline"
            title="Ver"
            onPress={() => {
              setActionMenuMovementId(null);
              setInfoMovement(movement);
            }}
          />
          <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={() => openEditForm(movement)} />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuMovementId(null);
              setDeleteMovement(movement);
            }}
          />
        </Menu>
      </Surface>
    );
  };

  const sectionHeader = (
    <View style={styles.sectionHeaderContent}>
      {showSectionPicker ? (
        <SegmentedButtons
          value={activeSection}
          onValueChange={(value) => setSelectedSection(value as HistorySection)}
          buttons={[
            { accessibilityLabel: 'Balance', icon: 'scale-balance', label: '', value: 'balance' },
            { accessibilityLabel: 'Movimientos', icon: 'format-list-bulleted', label: '', value: 'movements' },
          ]}
          style={styles.segmented}
        />
      ) : null}

      <AppScreenHeader
        eyebrow={activeSection === 'balance' ? 'RESUMEN' : 'HISTORIAL'}
        title={activeSection === 'balance' ? 'Balance' : 'Movimientos'}
      />
    </View>
  );

  const balanceHeader = (
    <View style={styles.headerContent}>
      {sectionHeader}

      <View style={styles.balanceSection}>
        <View style={styles.filterSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showBalanceFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            onPress={() => setShowBalanceFilters((current) => !current)}
            style={({ pressed }) => [styles.filterToggle, pressed ? styles.filterTogglePressed : null]}
          >
            <MaterialCommunityIcons name="filter-variant" size={18} color={colors.text} />
            <Text style={styles.filterToggleText}>{showBalanceFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</Text>
            <View style={styles.filterToggleSpacer} />
            <MaterialCommunityIcons name={showBalanceFilters ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedText} />
          </Pressable>
          <AppAnimatedDisclosure visible={showBalanceFilters} maxHeight={144} style={styles.filterGrid}>
              <View style={styles.filterControl}>
                <Text style={styles.filterLabel}>FECHA</Text>
                <View style={styles.dateControls}>
                  <View style={styles.dateInputWrap}>
                    <AppDateInput label="" value={selectedDate} onOpen={() => setIsBalanceDatePickerOpen(true)} />
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => updateSelectedDate(today)}
                    style={styles.todayButton}
                    contentStyle={styles.todayButtonContent}
                    textColor={colors.text}
                  >
                    Hoy
                  </Button>
                </View>
              </View>
              <FilterMenu
                colors={colors}
                label="CUENTA"
                selectedLabel={selectedBalanceAccountLabel}
                selectedValues={balanceAccountFilters}
                styles={styles}
                options={accountOptions}
                onChange={setBalanceAccountFilters}
              />
          </AppAnimatedDisclosure>
        </View>
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.balanceSectionHeader}>
          <Text style={styles.balanceSectionTitle}>Balance general</Text>
        </View>
        <AppReadOnlyRow
          icon="scale-balance"
          iconBackgroundColor={colors.selected}
          subtitle={formatAccountCount(visibleBalances.length)}
          title="Total"
          trailingText={formatAmount(totalBalance, data.currency)}
        />
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.balanceSectionHeader}>
          <Text style={styles.balanceSectionTitle}>Cuentas</Text>
          <Text style={styles.balanceSectionMeta}>{visibleBalances.length}</Text>
        </View>
        <View style={styles.accountBalanceGrid}>
          {visibleBalances.map((account) => (
            <AppReadOnlyRow
              key={account.accountId}
              icon={(account.accountIcon as keyof typeof MaterialCommunityIcons.glyphMap | null) ?? 'wallet-outline'}
              iconBackgroundColor={account.accountColor ?? colors.selected}
              title={account.accountName}
              trailingText={formatAmount(account.balance, data.currency)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const movementsHeader = (
    <View style={styles.movementsHeaderContent}>
      {sectionHeader}
      <View style={styles.filterSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          onPress={() => setShowFilters((current) => !current)}
          style={({ pressed }) => [styles.filterToggle, pressed ? styles.filterTogglePressed : null]}
        >
          <MaterialCommunityIcons name="filter-variant" size={18} color={colors.text} />
          <Text style={styles.filterToggleText}>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</Text>
          <View style={styles.filterToggleSpacer} />
          <MaterialCommunityIcons name={showFilters ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedText} />
        </Pressable>
        <AppAnimatedDisclosure visible={showFilters} maxHeight={192} style={styles.filterGrid}>
          <FilterMenu
            colors={colors}
            label="TIPO"
            selectedLabel={selectedTypeLabel}
            selectedValues={typeFilters}
            styles={styles}
            options={typeOptions}
            onChange={(values) => setTypeFilters(values as MovementType[])}
          />
          <FilterMenu
            colors={colors}
            label="CUENTA"
            selectedLabel={selectedAccountLabel}
            selectedValues={accountFilters}
            styles={styles}
            options={accountOptions}
            onChange={setAccountFilters}
          />
          <FilterMenu
            colors={colors}
            label="CATEGORIA"
            selectedLabel={selectedCategoryLabel}
            selectedValues={categoryFilters}
            styles={styles}
            options={categoryOptions}
            onChange={setCategoryFilters}
          />
        </AppAnimatedDisclosure>
      </View>

    </View>
  );

  if (!selectedNotebookId) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.container}>
          <Surface style={styles.emptyPanel} elevation={0}>
            <MaterialCommunityIcons name="book-alert-outline" size={36} color={colors.mutedText} />
            <Text style={styles.emptyTitle}>Selecciona una libreta</Text>
            <Text style={styles.emptyText}>Entra primero a una libreta para revisar tu historial.</Text>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={activeSection === 'movements' ? movementRows : []}
          keyExtractor={(item) => item.id}
          renderItem={renderMovementRow}
          ListHeaderComponent={activeSection === 'balance' ? balanceHeader : movementsHeader}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            activeSection === 'balance' ? null : isLoading && !hasLoadedHistoryOnce ? (
              <Surface style={styles.emptyPanel} elevation={0}>
                <AppLoadingState colors={colors} label="Cargando historial" />
              </Surface>
            ) : (
              <Surface style={styles.emptyPanel} elevation={0}>
                <MaterialCommunityIcons name="history" size={36} color={colors.mutedText} />
                <Text style={styles.emptyTitle}>Sin movimientos</Text>
                <Text style={styles.emptyText}>Ajusta los filtros o registra movimientos nuevos.</Text>
              </Surface>
            )
          }
          showsVerticalScrollIndicator={false}
        />
        {activeSection === 'movements' ? (
          <View style={styles.fabWrap} pointerEvents="box-none">
            {isCreateMenuMounted ? (
              <Animated.View style={createMenuAnimatedStyle}>
                <Surface style={styles.fabMenu} elevation={0}>
                  <FabOption
                    colors={colors}
                    icon="arrow-down-circle-outline"
                    label="Ingreso"
                    styles={styles}
                    onPress={() => openCreateForm('income')}
                  />
                  <FabOption
                    colors={colors}
                    icon="arrow-up-circle-outline"
                    label="Gasto"
                    styles={styles}
                    onPress={() => openCreateForm('expense')}
                  />
                  <FabOption
                    colors={colors}
                    icon="swap-horizontal-circle-outline"
                    label="Transferencia"
                    styles={styles}
                    onPress={() => openCreateForm('transfer')}
                  />
                </Surface>
              </Animated.View>
            ) : null}
            <Pressable
              accessibilityLabel={createMenuOpen ? 'Cerrar opciones de movimiento' : 'Nuevo movimiento'}
              accessibilityRole="button"
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
              onPress={createMenuOpen ? closeCreateMenu : openCreateMenu}
            >
              <Animated.View style={createButtonIconAnimatedStyle}>
                <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
              </Animated.View>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Portal>
        <MovementFormDialog
          accounts={data.accounts}
          budgets={data.budgets}
          categories={data.categoriesRaw}
          colors={colors}
          currency={data.currency}
          editing={Boolean(editingMovement)}
          mode={createMode}
          showAccountError={showAccountError}
          showAmountError={showAmountError}
          styles={styles}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onOpenDatePicker={() => setIsDatePickerOpen(true)}
          onSave={saveForm}
        />
        <AppDatePickerDialog
          selectedDate={selectedDate}
          today={today}
          visible={isBalanceDatePickerOpen}
          onDismiss={() => setIsBalanceDatePickerOpen(false)}
          onSelect={(dateKey) => {
            updateSelectedDate(dateKey);
            setIsBalanceDatePickerOpen(false);
          }}
        />
        <AppDatePickerDialog
          selectedDate={formValues.dateKey}
          today={today}
          visible={isDatePickerOpen}
          onDismiss={() => setIsDatePickerOpen(false)}
          onSelect={(dateKey) => {
            setFormValues((current) => ({ ...current, dateKey }));
            setIsDatePickerOpen(false);
          }}
        />
        <AppContentDialog
          visible={Boolean(infoMovement)}
          title="Detalle"
          titleIcon="eye-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoMovement(null)}
          onDismiss={() => setInfoMovement(null)}
        >
          {infoMovement ? (
            <>
              <AppInfoLine label="Tipo" value={getMovementLabel(infoMovement.type)} />
              <AppInfoLine
                label="Monto"
                value={getSignedAmount(infoMovement.type, infoMovement.amount, data.currency)}
              />
              <AppInfoLine label="Fecha" value={formatMovementTitleDate(infoMovement.occurredAt)} />
              <AppInfoLine label="Cuenta" value={infoMovement.accountName} />
              {infoMovement.toAccountName ? <AppInfoLine label="Destino" value={infoMovement.toAccountName} /> : null}
              <AppInfoLine label="Categoria" value={infoMovement.categoryName ?? 'Transferencia'} />
              <AppInfoLine label="Descripcion" value={infoMovement.description || 'Sin descripcion'} />
            </>
          ) : null}
        </AppContentDialog>
        <AppConfirmDialog
          visible={Boolean(deleteMovement)}
          title="Eliminar movimiento"
          message="Esta accion archivara el movimiento y dejara de mostrarse."
          onCancel={() => setDeleteMovement(null)}
          onConfirm={confirmDelete}
        />
      </Portal>
    </SafeAreaView>
  );
}

type FabOptionProps = {
  colors: MeowneyColors;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
};

function FabOption({ colors, icon, label, styles, onPress }: FabOptionProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fabOption, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
      <Text style={styles.fabOptionText}>{label}</Text>
    </Pressable>
  );
}

type MovementFormDialogProps = {
  accounts: Account[];
  budgets: BudgetListItem[];
  categories: Category[];
  colors: MeowneyColors;
  currency: string;
  editing: boolean;
  mode: MovementType;
  showAccountError: boolean;
  showAmountError: boolean;
  styles: ReturnType<typeof createStyles>;
  values: MovementFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: MovementFormValues) => void;
  onOpenDatePicker: () => void;
  onSave: () => void;
};

function MovementFormDialog({
  accounts,
  budgets,
  categories,
  colors,
  currency,
  editing,
  mode,
  showAccountError,
  showAmountError,
  styles,
  values,
  visible,
  onCancel,
  onChange,
  onOpenDatePicker,
  onSave,
}: MovementFormDialogProps) {
  const formScrollRef = useRef<ScrollView>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [budgetMenuOpen, setBudgetMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [fromMenuOpen, setFromMenuOpen] = useState(false);
  const [toMenuOpen, setToMenuOpen] = useState(false);
  const isTransfer = mode === 'transfer';
  const selectedAccount = accounts.find((account) => account.id === values.accountId);
  const categoryOptions = categories.filter((category) => category.type === mode);
  const selectedCategory = categories.find((category) => category.id === values.categoryId);
  const budgetOptions = budgets.filter((budget) => budget.categoryId === values.categoryId);
  const selectedBudget = budgets.find((budget) => budget.id === values.budgetId);
  const fromAccount = accounts.find((account) => account.id === values.fromAccountId);
  const toAccount = accounts.find((account) => account.id === values.toAccountId);
  const parsedAmount = parseAmount(values.amount) ?? 0;
  const spentAmount = selectedBudget ? budgetRepository.getSpentAmount(selectedBudget.id) : 0;
  const remainingAmount = selectedBudget ? selectedBudget.amount - spentAmount - parsedAmount : null;

  return (
    <AppFormDialog
      visible={visible}
      title={
        editing
          ? isTransfer
            ? 'Editar transferencia'
            : mode === 'income'
              ? 'Editar ingreso'
              : 'Editar gasto'
          : isTransfer
            ? 'Nueva transferencia'
            : mode === 'income'
              ? 'Nuevo ingreso'
              : 'Nuevo gasto'
      }
      contentContainerStyle={styles.form}
      scrollRef={formScrollRef}
      titleIcon={
        getMovementIcon(mode)
      }
      titleIconColor={getMovementColor(colors, mode)}
      onCancel={onCancel}
      onSave={onSave}
    >
      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>FECHA</Text>
        <AppDateInput value={values.dateKey} onOpen={onOpenDatePicker} />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>MONTO</Text>
        <TextInput
          mode="outlined"
          placeholder="Ej. 250.00"
          keyboardType="decimal-pad"
          value={values.amount}
          onChangeText={(amount) => onChange({ ...values, amount })}
          error={showAmountError}
        />
        {showAmountError ? (
          <HelperText type="error" visible>
            Ingresa un monto mayor a cero.
          </HelperText>
        ) : null}
      </View>

      {isTransfer ? (
        <>
          <AccountMenu
            accounts={accounts}
            colors={colors}
            label="CUENTA ORIGEN"
            menuOpen={fromMenuOpen}
            selectedLabel={fromAccount?.name ?? 'Seleccionar cuenta'}
            styles={styles}
            onDismiss={() => setFromMenuOpen(false)}
            onOpen={() => setFromMenuOpen(true)}
            onSelect={(fromAccountId) => {
              onChange({ ...values, fromAccountId });
              setFromMenuOpen(false);
            }}
          />
          <AccountMenu
            accounts={accounts}
            colors={colors}
            label="CUENTA DESTINO"
            menuOpen={toMenuOpen}
            selectedLabel={toAccount?.name ?? 'Seleccionar cuenta'}
            styles={styles}
            onDismiss={() => setToMenuOpen(false)}
            onOpen={() => setToMenuOpen(true)}
            onSelect={(toAccountId) => {
              onChange({ ...values, toAccountId });
              setToMenuOpen(false);
            }}
          />
        </>
      ) : (
        <>
          <AccountMenu
            accounts={accounts}
            colors={colors}
            label="CUENTA"
            menuOpen={accountMenuOpen}
            selectedLabel={selectedAccount?.name ?? 'Seleccionar cuenta'}
            styles={styles}
            onDismiss={() => setAccountMenuOpen(false)}
            onOpen={() => setAccountMenuOpen(true)}
            onSelect={(accountId) => {
              onChange({ ...values, accountId });
              setAccountMenuOpen(false);
            }}
          />
          <CategoryMenu
            categories={categoryOptions}
            colors={colors}
            menuOpen={categoryMenuOpen}
            selectedLabel={selectedCategory?.name ?? 'Seleccionar categoria'}
            styles={styles}
            onDismiss={() => setCategoryMenuOpen(false)}
            onOpen={() => setCategoryMenuOpen(true)}
            onSelect={(categoryId) => {
              onChange({ ...values, categoryId, budgetId: '' });
              setCategoryMenuOpen(false);
            }}
          />
          {mode === 'expense' ? (
            <>
              <BudgetMenu
                budgets={budgetOptions}
                colors={colors}
                menuOpen={budgetMenuOpen}
                selectedLabel={selectedBudget?.categoryName ?? 'Sin presupuesto'}
                styles={styles}
                onDismiss={() => setBudgetMenuOpen(false)}
                onOpen={() => setBudgetMenuOpen(true)}
                onSelect={(budgetId) => {
                  onChange({ ...values, budgetId });
                  setBudgetMenuOpen(false);
                }}
              />
              {selectedBudget ? (
                <Surface style={styles.budgetRemaining} elevation={0}>
                  <Text style={styles.budgetRemainingLabel}>PRESUPUESTO</Text>
                  <Text
                    style={[
                      styles.budgetRemainingAmount,
                      remainingAmount !== null && remainingAmount < 0 && styles.budgetRemainingNegative,
                    ]}
                  >
                    Quedaria {formatAmount(remainingAmount ?? 0, currency)}
                  </Text>
                </Surface>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {showAccountError ? (
        <HelperText type="error" visible>
          {isTransfer ? 'Selecciona dos cuentas diferentes.' : 'Selecciona cuenta y categoria.'}
        </HelperText>
      ) : null}

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <AppDescriptionInput
          placeholder="Ej. Supermercado"
          value={values.description}
          scrollRef={formScrollRef}
          onChangeText={(description) => onChange({ ...values, description })}
        />
      </View>
    </AppFormDialog>
  );
}

type AccountMenuProps = {
  accounts: Account[];
  colors: MeowneyColors;
  label: string;
  menuOpen: boolean;
  selectedLabel: string;
  styles: ReturnType<typeof createStyles>;
  onDismiss: () => void;
  onOpen: () => void;
  onSelect: (accountId: string) => void;
};

function AccountMenu({
  accounts,
  colors,
  label,
  menuOpen,
  selectedLabel,
  styles,
  onDismiss,
  onOpen,
  onSelect,
}: AccountMenuProps) {
  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Menu
        visible={menuOpen}
        onDismiss={onDismiss}
        contentStyle={styles.menuContent}
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            onPress={onOpen}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}
            textColor={colors.text}
          >
            {selectedLabel}
          </Button>
        }
      >
        {accounts.map((account) => (
          <Menu.Item key={account.id} title={account.name} onPress={() => onSelect(account.id)} />
        ))}
      </Menu>
    </View>
  );
}

type CategoryMenuProps = {
  categories: Category[];
  colors: MeowneyColors;
  menuOpen: boolean;
  selectedLabel: string;
  styles: ReturnType<typeof createStyles>;
  onDismiss: () => void;
  onOpen: () => void;
  onSelect: (categoryId: string) => void;
};

function CategoryMenu({
  categories,
  colors,
  menuOpen,
  selectedLabel,
  styles,
  onDismiss,
  onOpen,
  onSelect,
}: CategoryMenuProps) {
  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>CATEGORIA</Text>
      <Menu
        visible={menuOpen}
        onDismiss={onDismiss}
        contentStyle={styles.menuContent}
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            onPress={onOpen}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}
            textColor={colors.text}
          >
            {selectedLabel}
          </Button>
        }
      >
        {categories.map((category) => (
          <Menu.Item key={category.id} title={category.name} onPress={() => onSelect(category.id)} />
        ))}
      </Menu>
    </View>
  );
}

type BudgetMenuProps = {
  budgets: BudgetListItem[];
  colors: MeowneyColors;
  menuOpen: boolean;
  selectedLabel: string;
  styles: ReturnType<typeof createStyles>;
  onDismiss: () => void;
  onOpen: () => void;
  onSelect: (budgetId: string) => void;
};

function BudgetMenu({
  budgets,
  colors,
  menuOpen,
  selectedLabel,
  styles,
  onDismiss,
  onOpen,
  onSelect,
}: BudgetMenuProps) {
  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>PRESUPUESTO</Text>
      <Menu
        visible={menuOpen}
        onDismiss={onDismiss}
        contentStyle={styles.menuContent}
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            onPress={onOpen}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}
            textColor={colors.text}
          >
            {selectedLabel}
          </Button>
        }
      >
        <Menu.Item title="Sin presupuesto" onPress={() => onSelect('')} />
        {budgets.map((budget) => (
          <Menu.Item key={budget.id} title={budget.categoryName} onPress={() => onSelect(budget.id)} />
        ))}
      </Menu>
    </View>
  );
}

type FilterOption = {
  label: string;
  value: string;
};

type FilterMenuProps = {
  colors: MeowneyColors;
  label: string;
  options: FilterOption[];
  selectedLabel: string;
  selectedValues: string[];
  styles: ReturnType<typeof createStyles>;
  onChange: (values: string[]) => void;
};

function FilterMenu({
  colors,
  label,
  options,
  selectedLabel,
  selectedValues,
  styles,
  onChange,
}: FilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.filterControl}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentStyle={styles.menuContent}
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            onPress={() => setIsOpen(true)}
            style={styles.filterButton}
            contentStyle={styles.filterButtonContent}
            textColor={colors.text}
          >
            {selectedLabel}
          </Button>
        }
      >
        <Menu.Item
          leadingIcon={selectedValues.length === 0 ? 'check' : undefined}
          title="Todos"
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

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 96,
    },
    headerContent: {
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    movementsHeaderContent: {
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    sectionHeaderContent: {
      gap: spacing.md,
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
    segmented: {
      backgroundColor: colors.background,
    },
    balanceSection: {
      gap: spacing.sm,
    },
    balanceSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    balanceSectionTitle: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    balanceSectionMeta: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
    },
    dateControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dateInputWrap: {
      flex: 1,
      minWidth: 0,
    },
    todayButton: {
      minWidth: 72,
      borderRadius: radii.button,
      borderColor: colors.border,
      margin: 0,
    },
    todayButtonContent: {
      minHeight: 48,
    },
    accountBalanceGrid: {
      gap: spacing.sm,
    },
    filterSection: {
      alignItems: 'stretch',
      gap: 2,
    },
    filterToggle: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.button,
      marginLeft: -spacing.sm,
      marginRight: -spacing.sm,
    },
    filterTogglePressed: {
      backgroundColor: colors.selected,
    },
    filterToggleText: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.bodyWeight,
    },
    filterToggleSpacer: {
      flex: 1,
    },
    filterGrid: {
      width: '100%',
      gap: spacing.xs,
    },
    filterControl: {
      gap: 2,
    },
    filterLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    filterButton: {
      borderRadius: radii.button,
      borderColor: colors.pressed,
      backgroundColor: colors.selected,
    },
    filterButtonContent: {
      minHeight: 38,
      flexDirection: 'row-reverse',
    },
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    selectButton: {
      borderRadius: radii.button,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    selectButtonContent: {
      minHeight: 44,
      flexDirection: 'row-reverse',
    },
    form: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
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
    descriptionInput: {
      minHeight: 88,
      backgroundColor: colors.background,
    },
    descriptionInputContent: {
      minHeight: 88,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      textAlignVertical: 'top',
    },
    budgetRemaining: {
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.sm,
    },
    budgetRemainingLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    budgetRemainingAmount: {
      color: colors.success,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    budgetRemainingNegative: {
      color: colors.error,
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
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      opacity: 0.72,
      borderRadius: 28,
      backgroundColor: colors.primary,
    },
    fabPressed: {
      opacity: 0.88,
    },
    fabMenu: {
      overflow: 'hidden',
      minWidth: 188,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    fabOption: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    fabOptionText: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    pressed: {
      backgroundColor: colors.pressed,
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
    infoDialogContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    infoLine: {
      gap: spacing.xs,
    },
    infoLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    infoValue: {
      color: colors.text,
      fontSize: typography.bodySize,
      lineHeight: 22,
    },
    monthGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    monthGroupHeaderFirst: {
      paddingTop: 0,
    },
    monthGroupTitle: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    monthGroupCount: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
    },
    movementRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    movementContent: {
      flex: 1,
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    movementPressed: {
      backgroundColor: colors.selected,
    },
    movementCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    movementDateLabel: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.bodyWeight,
      lineHeight: 20,
    },
    movementMetaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
    },
    movementMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    movementAccountText: {
      flex: 1,
      minWidth: 0,
    },
    movementCategoryText: {
      flex: 1,
      minWidth: 0,
    },
    movementMetaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.border,
    },
    amount: {
      minWidth: 84,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      textAlign: 'right',
    },
    movementActionsButton: {
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
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: typography.subheadingSize,
      fontWeight: typography.titleWeight,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
