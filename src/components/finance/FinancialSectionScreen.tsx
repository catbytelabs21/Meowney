import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Checkbox,
  Dialog,
  HelperText,
  IconButton,
  Menu,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  Tooltip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { AppAnimatedDisclosure } from "@/components/ui/AppAnimatedDisclosure";
import { AppBottomActionDrawer } from "@/components/ui/AppBottomActionDrawer";
import { AppCatFab } from "@/components/ui/AppCatFab";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import {
  AppDateInput,
  AppDatePickerDialog,
  toDateKey,
} from "@/components/ui/AppDatePicker";
import { AppScreenHeader } from "@/components/layout/AppScreen";
import {
  AppDescriptionInput,
  AppInfoLine,
  AppReadOnlyRow,
} from "@/components/ui/AppFormFields";
import {
  AppConfirmDialog,
  AppContentDialog,
  AppFormDialog,
} from "@/components/ui/AppFormDialog";
import { AppLoadingState } from "@/components/ui/AppLoadingState";
import { AppMeowneySnackbar } from "@/components/ui/AppMeowneySnackbar";
import { accountRepository } from "@/database/repositories/account.repository";
import { budgetRepository } from "@/database/repositories/budget.repository";
import { categoryRepository } from "@/database/repositories/category.repository";
import { historyRepository } from "@/database/repositories/history.repository";
import { notebookRepository } from "@/database/repositories/notebook.repository";
import {
  transactionRepository,
  type TransactionInput,
} from "@/database/repositories/transaction.repository";
import {
  transferRepository,
  type TransferInput,
} from "@/database/repositories/transfer.repository";
import { useDeferredQuery } from "@/hooks/useDeferredQuery";
import { useAppStore } from "@/stores/app.store";
import { getMeowneyColors, type MeowneyColors } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import {
  getCategoryAndChildIds,
  getCategoryDisplayName,
  getPrimaryCategories,
  getSelectedParentCategory,
  getSelectedSubcategory,
  getSubcategories,
} from "@/utils/categoryHierarchy";
import { formatAppDate } from "@/utils/dateFormat";
import { formatMoneyFromCents, parseMoneyToCents } from "@/utils/moneyFormat";
import type { Account } from "@/features/accounts/types";
import type { AccountBalance } from "@/features/balance/types";
import type { BudgetListItem } from "@/features/budgets/types";
import type { Category } from "@/features/categories/types";
import type {
  MovementCategoryFilter,
  MovementItem,
} from "@/features/movements/types";
import type {
  MovementType,
  TransactionType,
} from "@/features/transactions/types";

type FinancialSection = "balance" | "movements";

type FinancialSectionScreenProps = {
  section?: FinancialSection;
};

type FinancialData = {
  accounts: Account[];
  balances: AccountBalance[];
  balanceTrend: BalanceTrendPoint[];
  budgets: BudgetListItem[];
  categoriesRaw: Category[];
  categories: MovementCategoryFilter[];
  currency: string;
  movements: MovementItem[];
};

type MovementFormValues = {
  accountId: string;
  amount: string;
  budgetId: string;
  categoryId: string;
  dateKey: string;
  description: string;
  fromAccountId: string;
  isRecurring: boolean;
  recurrenceEndDateKey: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: string;
  toAccountId: string;
};

type BalanceTrendPoint = {
  balances: AccountBalance[];
  dateKey: string;
  label: string;
};

type BalanceChartMode = "distribution" | "trend";
type MovementSummaryRange = "month" | "all";
type MovementPeriod =
  | "last7"
  | "last30"
  | "currentMonth"
  | "previousMonth"
  | "last90"
  | "currentYear"
  | "all"
  | "custom";
type CustomPeriodPickerTarget = "start" | "end";
type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
type RecurringScope = "single" | "future";
type PendingRecurringScope =
  | {
      input: TransactionInput;
      kind: "edit";
      movement: MovementItem;
    }
  | {
      kind: "delete";
      movement: MovementItem;
    };

type MovementListRow =
  | {
      count: number;
      id: string;
      isExpanded: boolean;
      label: string;
      monthKey: string;
      type: "month";
    }
  | {
      hiddenCount: number;
      id: string;
      monthKey: string;
      type: "loadMore";
    }
  | {
      id: string;
      movement: MovementItem;
      type: "movement";
    };

const MOVEMENTS_PER_MONTH_PAGE = 10;
const BALANCE_CHART_CONTENT_HEIGHT = 122;
const BALANCE_TREND_PLOT_HEIGHT = 96;

function toDateTime(dateKey: string) {
  return `${dateKey}T12:00:00.000Z`;
}

function addDays(dateKey: string, offset: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + offset);

  return toDateKey(date);
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return { day, monthIndex: month - 1, year };
}

function addMonthsClamped(dateKey: string, offset: number) {
  const { day, monthIndex, year } = parseDateKey(dateKey);
  const target = new Date(year, monthIndex + offset, 1, 12);
  const targetDay = Math.min(
    day,
    getDaysInMonth(target.getFullYear(), target.getMonth()),
  );

  return toDateKey(
    new Date(target.getFullYear(), target.getMonth(), targetDay, 12),
  );
}

function addYearsClamped(dateKey: string, offset: number) {
  const { day, monthIndex, year } = parseDateKey(dateKey);
  const targetYear = year + offset;
  const targetDay = Math.min(day, getDaysInMonth(targetYear, monthIndex));

  return toDateKey(new Date(targetYear, monthIndex, targetDay, 12));
}

function addRecurringInterval(
  dateKey: string,
  frequency: RecurrenceFrequency,
  interval: number,
) {
  if (frequency === "daily") {
    return addDays(dateKey, interval);
  }

  if (frequency === "weekly") {
    return addDays(dateKey, interval * 7);
  }

  if (frequency === "monthly") {
    return addMonthsClamped(dateKey, interval);
  }

  return addYearsClamped(dateKey, interval);
}

function createRecurringDateKeys(
  startDateKey: string,
  endDateKey: string,
  frequency: RecurrenceFrequency,
  interval: number,
) {
  const dateKeys: string[] = [];
  let occurrenceIndex = 0;
  let currentDateKey = startDateKey;

  while (currentDateKey <= endDateKey && dateKeys.length < 500) {
    dateKeys.push(currentDateKey);
    occurrenceIndex += 1;
    currentDateKey = addRecurringInterval(
      startDateKey,
      frequency,
      interval * occurrenceIndex,
    );
  }

  return dateKeys;
}

function getMonthStartDateKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

function getMonthEndDateKeyFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getPreviousMonthRange(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0);

  return {
    end: toDateKey(end),
    start: toDateKey(start),
  };
}

function formatMovementTitleDate(value: string) {
  return formatAppDate(value);
}

function formatMovementGroupDate(value: string, todayKey: string) {
  const dateKey = value.slice(0, 10);

  if (dateKey === todayKey) {
    return "Hoy";
  }

  const yesterday = new Date(toDateTime(todayKey));
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === toDateKey(yesterday)) {
    return "Ayer";
  }

  const label = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(toDateTime(dateKey)));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function formatMovementMonth(value: string) {
  const dateKey = value.length === 7 ? `${value}-01` : value.slice(0, 10);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(toDateTime(dateKey)));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1 + offset, 1, 12))
    .toISOString()
    .slice(0, 7);
}

function getLatestMovementMonth(
  movements: MovementItem[],
  fallbackMonth: string,
) {
  return movements.reduce((latestMonth, movement) => {
    const movementMonth = movement.occurredAt.slice(0, 7);

    return movementMonth > latestMonth ? movementMonth : latestMonth;
  }, fallbackMonth);
}

function getEarliestMovementMonth(
  movements: MovementItem[],
  fallbackMonth: string,
) {
  return movements.reduce((earliestMonth, movement) => {
    const movementMonth = movement.occurredAt.slice(0, 7);

    return movementMonth < earliestMonth ? movementMonth : earliestMonth;
  }, fallbackMonth);
}

function formatFilterTooltip(value: string) {
  const lowerValue = value.toLocaleLowerCase("es-MX");

  return `${lowerValue.charAt(0).toLocaleUpperCase("es-MX")}${lowerValue.slice(1)}`;
}

function formatTrendMonth(value: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "short" })
    .format(new Date(`${value}T12:00:00.000Z`))
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();
}

function formatAmount(amount: number, currency: string) {
  return formatMoneyFromCents(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactAmount(amount: number) {
  const value = amount / 100;
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absoluteValue >= 1000000) {
    return `${sign}$${(absoluteValue / 1000000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1000) {
    return `${sign}$${Math.round(absoluteValue / 1000)}k`;
  }

  return `${sign}$${Math.round(absoluteValue)}`;
}

function formatAccountCount(count: number) {
  return count === 1 ? "1 cuenta incluida" : `${count} cuentas incluidas`;
}

function parseAmount(value: string) {
  return parseMoneyToCents(value);
}

function getMonthEndDateKey(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12))
    .toISOString()
    .slice(0, 10);
}

function getBalanceTrendPoints(
  notebookId: string,
  endDateKey: string,
): BalanceTrendPoint[] {
  const endDate = new Date(`${endDateKey}T12:00:00.000Z`);

  return Array.from({ length: 6 }, (_, index) => {
    const monthOffset = 5 - index;
    const monthDate = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth() - monthOffset,
        1,
        12,
      ),
    );
    const isCurrentPoint = index === 5;
    const dateKey = isCurrentPoint
      ? endDateKey
      : getMonthEndDateKey(monthDate.getUTCFullYear(), monthDate.getUTCMonth());

    return {
      balances: historyRepository.getBalancesByNotebookAtDate(
        notebookId,
        dateKey,
      ),
      dateKey,
      label: formatTrendMonth(dateKey),
    };
  });
}

function getSignedAmount(type: MovementType, amount: number, currency: string) {
  if (type === "income") {
    return `+${formatAmount(amount, currency)}`;
  }

  if (type === "expense") {
    return `-${formatAmount(amount, currency)}`;
  }

  return formatAmount(amount, currency);
}

function getMovementColor(colors: MeowneyColors, type: MovementType) {
  if (type === "income") {
    return colors.success;
  }

  if (type === "expense") {
    return colors.error;
  }

  return colors.cyanSignal;
}

function getInitialForm(
  accounts: Account[],
  categories: Category[],
  mode: MovementType,
  dateKey: string,
): MovementFormValues {
  const categoryType = mode === "income" ? "income" : "expense";
  const firstCategory = categories.find(
    (category) => category.type === categoryType,
  );

  return {
    accountId: accounts[0]?.id ?? "",
    amount: "",
    budgetId: "",
    categoryId: mode === "transfer" ? "" : (firstCategory?.id ?? ""),
    dateKey,
    description: "",
    fromAccountId: accounts[0]?.id ?? "",
    isRecurring: false,
    recurrenceEndDateKey: dateKey,
    recurrenceFrequency: "monthly",
    recurrenceInterval: "1",
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
  };
}

function summarizeSelection(
  selectedValues: string[],
  emptyLabel: string,
  options: FilterOption[],
) {
  if (selectedValues.length === 0) {
    return emptyLabel;
  }

  if (selectedValues.length === 1) {
    return (
      options.find((option) => option.value === selectedValues[0])?.label ??
      emptyLabel
    );
  }

  return `${selectedValues.length} seleccionados`;
}

function filterMovements(
  movements: MovementItem[],
  typeFilters: MovementType[],
  accountFilters: string[],
  categoryFilters: string[],
  subcategoryFilters: string[],
  categories: Category[],
) {
  const categoryFilterIds = new Set(
    categoryFilters.flatMap((categoryId) =>
      Array.from(getCategoryAndChildIds(categories, categoryId)),
    ),
  );
  const subcategoryFilterIds = new Set(subcategoryFilters);

  return movements.filter((movement) => {
    const matchesType =
      typeFilters.length === 0 || typeFilters.includes(movement.type);
    const matchesAccount =
      accountFilters.length === 0 ||
      accountFilters.includes(movement.accountId) ||
      (movement.toAccountId
        ? accountFilters.includes(movement.toAccountId)
        : false);
    const matchesCategory =
      categoryFilters.length === 0 ||
      (movement.categoryId
        ? categoryFilterIds.has(movement.categoryId)
        : false);
    const matchesSubcategory =
      subcategoryFilters.length === 0 ||
      (movement.categoryId
        ? subcategoryFilterIds.has(movement.categoryId)
        : false);
    return (
      matchesType && matchesAccount && matchesCategory && matchesSubcategory
    );
  });
}

function getMovementPeriodRange(
  period: MovementPeriod,
  today: string,
  customStart: string,
  customEnd: string,
) {
  if (period === "all") {
    return null;
  }

  if (period === "last7") {
    return { end: today, start: addDays(today, -6) };
  }

  if (period === "last30") {
    return { end: today, start: addDays(today, -29) };
  }

  if (period === "currentMonth") {
    return {
      end: getMonthEndDateKeyFromDateKey(today),
      start: getMonthStartDateKey(today),
    };
  }

  if (period === "previousMonth") {
    return getPreviousMonthRange(today);
  }

  if (period === "last90") {
    return { end: today, start: addDays(today, -89) };
  }

  if (period === "currentYear") {
    return {
      end: `${today.slice(0, 4)}-12-31`,
      start: `${today.slice(0, 4)}-01-01`,
    };
  }

  return customStart <= customEnd
    ? { end: customEnd, start: customStart }
    : { end: customStart, start: customEnd };
}

function filterMovementsByPeriod(
  movements: MovementItem[],
  period: MovementPeriod,
  today: string,
  customStart: string,
  customEnd: string,
) {
  const range = getMovementPeriodRange(period, today, customStart, customEnd);

  if (!range) {
    return movements;
  }

  return movements.filter((movement) => {
    const dateKey = movement.occurredAt.slice(0, 10);

    return dateKey >= range.start && dateKey <= range.end;
  });
}

function groupMovementsByMonth(
  movements: MovementItem[],
  expandedMonths: Set<string>,
  visibleMovementCountsByMonth: Record<string, number>,
  todayKey: string,
): MovementListRow[] {
  const rows: MovementListRow[] = [];
  const movementsByDate = new Map<string, MovementItem[]>();
  const seenDates = new Set<string>();

  movements.forEach((movement) => {
    const dateKey = movement.occurredAt.slice(0, 10);
    movementsByDate.set(dateKey, [
      ...(movementsByDate.get(dateKey) ?? []),
      movement,
    ]);
  });

  movements.forEach((movement) => {
    const dateKey = movement.occurredAt.slice(0, 10);

    if (!seenDates.has(dateKey)) {
      const dayMovements = movementsByDate.get(dateKey) ?? [];
      const isExpanded = expandedMonths.has(dateKey);
      const visibleCount =
        visibleMovementCountsByMonth[dateKey] ?? MOVEMENTS_PER_MONTH_PAGE;
      seenDates.add(dateKey);
      rows.push({
        count: dayMovements.length,
        id: `day_${dateKey}`,
        isExpanded,
        label: formatMovementGroupDate(movement.occurredAt, todayKey),
        monthKey: dateKey,
        type: "month",
      });

      if (isExpanded) {
        dayMovements.slice(0, visibleCount).forEach((monthMovement) => {
          rows.push({
            id: `${monthMovement.type}_${monthMovement.id}`,
            movement: monthMovement,
            type: "movement",
          });
        });

        if (dayMovements.length > visibleCount) {
          rows.push({
            hiddenCount: dayMovements.length - visibleCount,
            id: `load_more_${dateKey}`,
            monthKey: dateKey,
            type: "loadMore",
          });
        }
      }
    }
  });

  return rows;
}

function getMovementLabel(type: MovementType) {
  if (type === "income") {
    return "Ingreso";
  }

  if (type === "expense") {
    return "Gasto";
  }

  return "Transferencia";
}

function getMovementIcon(
  type: MovementType,
): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type === "income") {
    return "arrow-up-circle-outline";
  }

  if (type === "expense") {
    return "arrow-down-circle-outline";
  }

  return "swap-horizontal-circle-outline";
}

function isActiveRecurringMovement(movement: MovementItem | null) {
  return Boolean(
    movement &&
    movement.type !== "transfer" &&
    movement.transactionGroupId &&
    !movement.transactionGroupDetachedAt,
  );
}

export function FinancialSectionScreen({
  section,
}: FinancialSectionScreenProps) {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const router = useRouter();
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedSection, setSelectedSection] =
    useState<FinancialSection>("balance");
  const [selectedDate, setSelectedDate] = useState(today);
  const [movementPeriod, setMovementPeriod] =
    useState<MovementPeriod>("currentMonth");
  const [customPeriodStart, setCustomPeriodStart] = useState(
    addDays(today, -29),
  );
  const [customPeriodEnd, setCustomPeriodEnd] = useState(today);
  const [customPeriodPickerTarget, setCustomPeriodPickerTarget] =
    useState<CustomPeriodPickerTarget | null>(null);
  const [typeFilters, setTypeFilters] = useState<MovementType[]>([]);
  const [accountFilters, setAccountFilters] = useState<string[]>([]);
  const [balanceAccountFilters, setBalanceAccountFilters] = useState<string[]>(
    [],
  );
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [subcategoryFilters, setSubcategoryFilters] = useState<string[]>([]);
  const [isCreateMenuMounted, setIsCreateMenuMounted] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState<MovementType>("expense");
  const [editingMovement, setEditingMovement] = useState<MovementItem | null>(
    null,
  );
  const [formValues, setFormValues] = useState<MovementFormValues>(() =>
    getInitialForm([], [], "expense", today),
  );
  const [infoMovement, setInfoMovement] = useState<MovementItem | null>(null);
  const [isBalanceDatePickerOpen, setIsBalanceDatePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isRecurrenceEndDatePickerOpen, setIsRecurrenceEndDatePickerOpen] =
    useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteMovement, setDeleteMovement] = useState<MovementItem | null>(
    null,
  );
  const [pendingRecurringScope, setPendingRecurringScope] =
    useState<PendingRecurringScope | null>(null);
  const [actionMenuMovementId, setActionMenuMovementId] = useState<
    string | null
  >(null);
  const [showAccountError, setShowAccountError] = useState(false);
  const [showAmountError, setShowAmountError] = useState(false);
  const [showRecurrenceError, setShowRecurrenceError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBalanceFilters, setShowBalanceFilters] = useState(false);
  const [expandedMovementMonths, setExpandedMovementMonths] = useState<
    Set<string>
  >(() => new Set([today]));
  const [visibleMovementCountsByMonth, setVisibleMovementCountsByMonth] =
    useState<Record<string, number>>({});
  const [balanceChartMode, setBalanceChartMode] =
    useState<BalanceChartMode>("distribution");
  const [movementSummaryRange, setMovementSummaryRange] =
    useState<MovementSummaryRange>("month");
  const [movementSummaryMonth, setMovementSummaryMonth] = useState(
    today.slice(0, 7),
  );
  const createMenuProgress = useRef(new Animated.Value(0)).current;

  const loadFinancialData = useCallback((): FinancialData => {
    if (!selectedNotebookId) {
      return {
        accounts: [],
        balances: [],
        balanceTrend: [],
        budgets: [],
        categories: [],
        categoriesRaw: [],
        currency: "MXN",
        movements: [],
      };
    }

    const notebook = notebookRepository.getActiveById(selectedNotebookId);
    categoryRepository.seedDefaultCategories(selectedNotebookId);

    return {
      accounts: accountRepository.listActiveByNotebook(selectedNotebookId),
      balances: historyRepository.getBalancesByNotebookAtDate(
        selectedNotebookId,
        selectedDate,
      ),
      balanceTrend: getBalanceTrendPoints(selectedNotebookId, selectedDate),
      budgets: budgetRepository.listActiveByNotebook(selectedNotebookId),
      categories:
        historyRepository.listCategoriesByNotebook(selectedNotebookId),
      categoriesRaw:
        categoryRepository.listActiveByNotebook(selectedNotebookId),
      currency: notebook?.currency ?? "MXN",
      movements: historyRepository.listMovementsByNotebook(selectedNotebookId),
    };
  }, [selectedDate, selectedNotebookId]);

  const { data, isLoading, reload } = useDeferredQuery(loadFinancialData, {
    accounts: [],
    balances: [],
    balanceTrend: [],
    budgets: [],
    categories: [],
    categoriesRaw: [],
    currency: "MXN",
    movements: [],
  });
  const [hasLoadedFinancialDataOnce, sethasLoadedFinancialDataOnce] =
    useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    if (!isLoading) {
      sethasLoadedFinancialDataOnce(true);
    }
  }, [isLoading]);

  useEffect(() => {
    setVisibleMovementCountsByMonth({});
  }, [
    accountFilters,
    categoryFilters,
    subcategoryFilters,
    customPeriodEnd,
    customPeriodStart,
    movementPeriod,
    selectedNotebookId,
    typeFilters,
  ]);

  const visibleBalances = useMemo(
    () =>
      balanceAccountFilters.length === 0
        ? data.balances
        : data.balances.filter((account) =>
            balanceAccountFilters.includes(account.accountId),
          ),
    [balanceAccountFilters, data.balances],
  );
  const totalBalance = useMemo(
    () =>
      visibleBalances.reduce((total, account) => total + account.balance, 0),
    [visibleBalances],
  );
  const openBalanceBreakdown = useCallback(() => {
    router.push({
      pathname: "/balance/breakdown",
      params: {
        accounts: balanceAccountFilters.join(","),
        date: selectedDate,
      },
    });
  }, [balanceAccountFilters, router, selectedDate]);
  const visibleMovements = useMemo(() => {
    const filteredMovements = filterMovements(
      data.movements,
      typeFilters,
      accountFilters,
      categoryFilters,
      subcategoryFilters,
      data.categoriesRaw,
    );

    return filterMovementsByPeriod(
      filteredMovements,
      movementPeriod,
      today,
      customPeriodStart,
      customPeriodEnd,
    );
  }, [
    accountFilters,
    categoryFilters,
    subcategoryFilters,
    customPeriodEnd,
    customPeriodStart,
    data.categoriesRaw,
    data.movements,
    movementPeriod,
    today,
    typeFilters,
  ]);
  const earliestMovementSummaryMonth = useMemo(
    () => getEarliestMovementMonth(visibleMovements, today.slice(0, 7)),
    [visibleMovements],
  );
  const latestMovementSummaryMonth = useMemo(
    () => getLatestMovementMonth(visibleMovements, today.slice(0, 7)),
    [visibleMovements],
  );
  const summarizedMovements = useMemo(
    () =>
      movementSummaryRange === "month"
        ? visibleMovements.filter(
            (movement) =>
              movement.occurredAt.slice(0, 7) === movementSummaryMonth,
          )
        : visibleMovements,
    [movementSummaryMonth, movementSummaryRange, visibleMovements],
  );
  const movementSummary = useMemo(
    () =>
      summarizedMovements.reduce(
        (summary, movement) => {
          if (movement.type === "income") {
            summary.income += movement.amount;
          } else if (movement.type === "expense") {
            summary.expense += movement.amount;
          } else {
            summary.transfer += movement.amount;
          }

          summary.total += 1;
          return summary;
        },
        { expense: 0, income: 0, total: 0, transfer: 0 },
      ),
    [summarizedMovements],
  );
  const movementRows = useMemo(
    () =>
      groupMovementsByMonth(
        visibleMovements,
        expandedMovementMonths,
        visibleMovementCountsByMonth,
        today,
      ),
    [
      expandedMovementMonths,
      today,
      visibleMovementCountsByMonth,
      visibleMovements,
    ],
  );
  const typeOptions = useMemo(
    () => [
      { label: "Ingresos", value: "income" },
      { label: "Gastos", value: "expense" },
      { label: "Transferencias", value: "transfer" },
    ],
    [],
  );
  const movementPeriodOptions = useMemo(
    () => [
      { label: "Últimos 7 días", value: "last7" },
      { label: "Últimos 30 días", value: "last30" },
      { label: "Últimos 90 días", value: "last90" },
      { label: "Mes actual", value: "currentMonth" },
      { label: "Mes anterior", value: "previousMonth" },
      { label: "Año actual", value: "currentYear" },
      { label: "Todo", value: "all" },
      { label: "Personalizado", value: "custom" },
    ],
    [],
  );
  const accountOptions = useMemo(
    () =>
      data.accounts.map((account) => ({
        label: account.name,
        value: account.id,
      })),
    [data.accounts],
  );
  const categoryOptions = useMemo(
    () =>
      getPrimaryCategories(data.categoriesRaw).map((category) => ({
        label: getCategoryDisplayName(data.categoriesRaw, category),
        value: category.id,
      })),
    [data.categoriesRaw],
  );
  const subcategoryGroups = useMemo(() => {
    const selectedCategoryIds = new Set(categoryFilters);

    return getPrimaryCategories(data.categoriesRaw)
      .filter(
        (category) =>
          selectedCategoryIds.size === 0 || selectedCategoryIds.has(category.id),
      )
      .map((category) => ({
        category: {
          label: category.name,
          value: category.id,
        },
        subcategories: getSubcategories(data.categoriesRaw, category.id).map(
          (subcategory) => ({
            label: subcategory.name,
            value: subcategory.id,
          }),
        ),
      }))
      .filter((group) => group.subcategories.length > 0);
  }, [categoryFilters, data.categoriesRaw]);
  const subcategoryOptions = useMemo(
    () => subcategoryGroups.flatMap((group) => group.subcategories),
    [subcategoryGroups],
  );
  const availableSubcategoryIds = useMemo(
    () => new Set(subcategoryOptions.map((option) => option.value)),
    [subcategoryOptions],
  );
  const selectedTypeLabel = summarizeSelection(
    typeFilters,
    "Todos",
    typeOptions,
  );
  const selectedMovementPeriodLabel =
    movementPeriod === "custom"
      ? `${formatAppDate(customPeriodStart)} - ${formatAppDate(customPeriodEnd)}`
      : (movementPeriodOptions.find((option) => option.value === movementPeriod)
          ?.label ?? "Todo");
  const selectedAccountLabel = summarizeSelection(
    accountFilters,
    "Todas las cuentas",
    accountOptions,
  );
  const selectedBalanceAccountLabel = summarizeSelection(
    balanceAccountFilters,
    "Todas las cuentas",
    accountOptions,
  );
  const selectedCategoryLabel = summarizeSelection(
    categoryFilters,
    "Todas las categorías",
    categoryOptions,
  );
  const selectedSubcategoryLabel = summarizeSelection(
    subcategoryFilters,
    "Todas las subcategorías",
    subcategoryOptions,
  );
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
  const updateSelectedDate = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
  }, []);
  const toggleBalanceFilters = useCallback(() => {
    setShowBalanceFilters((current) => !current);
  }, []);
  const clearBalanceFilters = useCallback(() => {
    setSelectedDate(today);
    setBalanceAccountFilters([]);
  }, [today]);
  const toggleMovementFilters = useCallback(() => {
    setShowFilters((current) => !current);
  }, []);
  const clearMovementFilters = useCallback(() => {
    setMovementPeriod("currentMonth");
    setCustomPeriodStart(addDays(today, -29));
    setCustomPeriodEnd(today);
    setTypeFilters([]);
    setAccountFilters([]);
    setCategoryFilters([]);
    setSubcategoryFilters([]);
    setMovementSummaryRange("month");
    setMovementSummaryMonth(today.slice(0, 7));
  }, [today]);
  const updateCategoryFilters = useCallback(
    (values: string[]) => {
      const selectedCategoryIds = new Set(values);
      const allowedSubcategoryIds = new Set(
        data.categoriesRaw
          .filter(
            (category) =>
              category.parentId &&
              (selectedCategoryIds.size === 0 ||
                selectedCategoryIds.has(category.parentId)),
          )
          .map((category) => category.id),
      );

      setCategoryFilters(values);
      setSubcategoryFilters((current) =>
        current.filter((categoryId) => allowedSubcategoryIds.has(categoryId)),
      );
    },
    [data.categoriesRaw],
  );

  useEffect(() => {
    setSubcategoryFilters((current) => {
      const next = current.filter((categoryId) =>
        availableSubcategoryIds.has(categoryId),
      );

      return next.length === current.length ? current : next;
    });
  }, [availableSubcategoryIds]);

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
    setFormValues(
      getInitialForm(data.accounts, data.categoriesRaw, mode, today),
    );
    setEditingMovement(null);
    closeCreateMenu();
    setShowAmountError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setIsDatePickerOpen(false);
    setIsRecurrenceEndDatePickerOpen(false);
    setEditingMovement(null);
    setShowAmountError(false);
    setShowAccountError(false);
    setShowRecurrenceError(false);
  };

  const openEditForm = (movement: MovementItem) => {
    setActionMenuMovementId(null);
    setCreateMode(movement.type);

    if (movement.type === "transfer") {
      const transfer = transferRepository.getActiveById(movement.id);
      if (!transfer) {
        return;
      }
      const dateKey = transfer.transferAt.slice(0, 10);
      setFormValues({
        accountId: "",
        amount: String(transfer.amount / 100),
        budgetId: "",
        categoryId: "",
        dateKey,
        description: transfer.description ?? "",
        fromAccountId: transfer.fromAccountId,
        isRecurring: false,
        recurrenceEndDateKey: dateKey,
        recurrenceFrequency: "monthly",
        recurrenceInterval: "1",
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
        budgetId: "",
        categoryId: transaction.categoryId,
        dateKey,
        description: transaction.description ?? "",
        fromAccountId: data.accounts[0]?.id ?? "",
        isRecurring: false,
        recurrenceEndDateKey: dateKey,
        recurrenceFrequency: "monthly",
        recurrenceInterval: "1",
        toAccountId: data.accounts[1]?.id ?? data.accounts[0]?.id ?? "",
      });
    }

    setEditingMovement(movement);
    setShowAmountError(false);
    setShowAccountError(false);
    setShowRecurrenceError(false);
    setIsFormOpen(true);
  };

  const saveForm = () => {
    if (!selectedNotebookId) {
      return;
    }

    const amount = parseAmount(formValues.amount);
    const isTransfer = createMode === "transfer";
    const hasAccount = isTransfer
      ? Boolean(
          formValues.fromAccountId &&
          formValues.toAccountId &&
          formValues.fromAccountId !== formValues.toAccountId,
        )
      : Boolean(formValues.accountId);
    const hasCategory = isTransfer || Boolean(formValues.categoryId);
    const recurrenceInterval = Number.parseInt(
      formValues.recurrenceInterval,
      10,
    );
    const hasValidRecurrence =
      !formValues.isRecurring ||
      (!isTransfer &&
        !editingMovement &&
        Number.isFinite(recurrenceInterval) &&
        recurrenceInterval > 0 &&
        formValues.recurrenceEndDateKey >= formValues.dateKey);

    setShowAmountError(!amount);
    setShowAccountError(!hasAccount || !hasCategory);
    setShowRecurrenceError(!hasValidRecurrence);

    if (!amount || !hasAccount || !hasCategory || !hasValidRecurrence) {
      return;
    }

    const savedMessage = editingMovement
      ? "Rastro actualizado en la guarida."
      : isTransfer
        ? "Salto entre cuentas registrado."
        : formValues.isRecurring
          ? "Rastros recurrentes preparados."
          : createMode === "income"
            ? "Ingreso registrado en la guarida."
            : "Gasto registrado en la guarida.";

    if (isTransfer) {
      const input: TransferInput = {
        amount,
        description: formValues.description.trim() || null,
        fromAccountId: formValues.fromAccountId,
        toAccountId: formValues.toAccountId,
        transferAt: toDateTime(formValues.dateKey),
      };

      if (editingMovement?.type === "transfer") {
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

      if (editingMovement && editingMovement.type !== "transfer") {
        if (isActiveRecurringMovement(editingMovement)) {
          setPendingRecurringScope({
            input,
            kind: "edit",
            movement: editingMovement,
          });
          return;
        }

        transactionRepository.update(editingMovement.id, input);
      } else if (formValues.isRecurring) {
        const dateKeys = createRecurringDateKeys(
          formValues.dateKey,
          formValues.recurrenceEndDateKey,
          formValues.recurrenceFrequency,
          recurrenceInterval,
        );

        transactionRepository.createRecurring(
          dateKeys.map((dateKey) => ({
            ...input,
            transactionAt: toDateTime(dateKey),
          })),
        );
      } else {
        transactionRepository.create(input);
      }
    }

    setSnackbarMessage(savedMessage);
    closeForm();
    reload();
  };

  const applyRecurringScope = (scope: RecurringScope) => {
    if (!pendingRecurringScope) {
      return;
    }

    const { movement } = pendingRecurringScope;
    const groupId = movement.transactionGroupId;

    if (!groupId || movement.type === "transfer") {
      setPendingRecurringScope(null);
      return;
    }

    if (pendingRecurringScope.kind === "edit") {
      if (scope === "single") {
        transactionRepository.updateAndDetach(
          movement.id,
          pendingRecurringScope.input,
        );
      } else {
        transactionRepository.updateRecurringFuture(
          groupId,
          movement.occurredAt,
          movement.id,
          pendingRecurringScope.input,
        );
      }

      setPendingRecurringScope(null);
      closeForm();
      setSnackbarMessage(
        scope === "single"
          ? "Rastro separado y actualizado."
          : "Rastros futuros actualizados.",
      );
      reload();
      return;
    }

    if (scope === "single") {
      transactionRepository.archiveAndDetach(movement.id);
    } else {
      transactionRepository.archiveRecurringFuture(
        groupId,
        movement.occurredAt,
      );
    }

    setPendingRecurringScope(null);
    setInfoMovement(null);
    setSnackbarMessage(
      scope === "single"
        ? "Rastro archivado fuera de la serie."
        : "Rastros futuros archivados.",
    );
    reload();
  };

  const confirmDelete = () => {
    if (!deleteMovement) {
      return;
    }

    if (deleteMovement.type === "transfer") {
      transferRepository.archive(deleteMovement.id);
    } else {
      transactionRepository.archive(deleteMovement.id);
    }

    setDeleteMovement(null);
    setInfoMovement(null);
    setSnackbarMessage("Rastro archivado fuera de la guarida.");
    reload();
  };

  const toggleMovementMonth = useCallback((monthKey: string) => {
    setExpandedMovementMonths((current) => {
      const next = new Set(current);

      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }

      return next;
    });
  }, []);

  const loadMoreMovementsForMonth = useCallback((monthKey: string) => {
    setVisibleMovementCountsByMonth((current) => ({
      ...current,
      [monthKey]:
        (current[monthKey] ?? MOVEMENTS_PER_MONTH_PAGE) +
        MOVEMENTS_PER_MONTH_PAGE,
    }));
  }, []);

  const cycleBalanceChart = useCallback(() => {
    setBalanceChartMode((current) =>
      current === "distribution" ? "trend" : "distribution",
    );
  }, []);

  const showAllMovementSummary = useCallback(() => {
    setMovementSummaryRange("all");
  }, []);

  const showPreviousMovementSummaryMonth = useCallback(() => {
    setMovementSummaryRange("month");
    setMovementSummaryMonth((current) =>
      current > earliestMovementSummaryMonth
        ? shiftMonthKey(current, -1)
        : current,
    );
  }, [earliestMovementSummaryMonth]);

  const showNextMovementSummaryMonth = useCallback(() => {
    setMovementSummaryRange("month");
    setMovementSummaryMonth((current) =>
      current < latestMovementSummaryMonth
        ? shiftMonthKey(current, 1)
        : current,
    );
  }, [latestMovementSummaryMonth]);

  const selectMovementPeriod = useCallback((period: MovementPeriod) => {
    setMovementPeriod(period);

    if (period === "currentMonth") {
      setMovementSummaryRange("month");
      setMovementSummaryMonth(today.slice(0, 7));
    }

    if (period === "previousMonth") {
      setMovementSummaryRange("month");
      setMovementSummaryMonth(shiftMonthKey(today.slice(0, 7), -1));
    }

    if (
      period === "last7" ||
      period === "last30" ||
      period === "last90" ||
      period === "currentYear"
    ) {
      setMovementSummaryRange("all");
    }

    if (period === "all") {
      setMovementSummaryRange("all");
    }

    if (period === "custom") {
      setCustomPeriodPickerTarget("start");
    }
  }, [today]);

  const movementKeyExtractor = useCallback((item: MovementListRow) => item.id, []);
  const renderMovementSeparator = useCallback(
    () => <View style={styles.separator} />,
    [styles.separator],
  );
  const renderMovementEmptyComponent = useCallback(
    () =>
      activeSection === "balance" ? null : isLoading &&
        !hasLoadedFinancialDataOnce ? (
        <Surface style={styles.emptyPanel} elevation={0}>
          <AppLoadingState colors={colors} label="Cargando historial" />
        </Surface>
      ) : (
        <AppEmptyState
          icon="paw-outline"
          title="Sin rastros todavía"
          message="Aquí aparecerán tus ingresos, gastos y movimientos entre cuentas. Registra el primero para que Meowney empiece a seguir el rastro de esta libreta."
          style={styles.emptyPanel}
        />
      ),
    [
      activeSection,
      colors,
      hasLoadedFinancialDataOnce,
      isLoading,
      styles.emptyPanel,
    ],
  );

  const renderMovementRow = useCallback(({
    item,
    index,
  }: {
    index: number;
    item: MovementListRow;
  }) => {
    if (item.type === "month") {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.isExpanded ? `Cerrar ${item.label}` : `Abrir ${item.label}`
          }
          onPress={() => toggleMovementMonth(item.monthKey)}
          style={({ pressed }) => [
            styles.monthGroupHeader,
            index === 0 ? styles.monthGroupHeaderFirst : null,
            pressed ? styles.monthGroupHeaderPressed : null,
          ]}
        >
          <View style={styles.monthGroupTitleWrap}>
            <Text style={styles.monthGroupTitle}>{item.label}</Text>
          </View>
          <View style={styles.chevronButton}>
            <MaterialCommunityIcons
              name={item.isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedText}
            />
          </View>
        </Pressable>
      );
    }

    if (item.type === "loadMore") {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver más movimientos"
          onPress={() => loadMoreMovementsForMonth(item.monthKey)}
          style={({ pressed }) => [
            styles.loadMoreRow,
            pressed ? styles.loadMoreRowPressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={18}
            color={colors.text}
          />
          <Text style={styles.loadMoreText}>Ver más movimientos</Text>
        </Pressable>
      );
    }

    const { movement } = item;
    const movementTitle =
      movement.type === "transfer"
        ? "Movimiento entre cuentas"
        : (movement.categoryName ?? getMovementLabel(movement.type));
    const movementSubtitle =
      movement.type === "transfer" && movement.toAccountName
        ? `${movement.accountName} -> ${movement.toAccountName}`
        : movement.accountName;

    return (
      <Surface style={styles.movementRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver movimiento"
          onPress={() => setInfoMovement(movement)}
          style={({ pressed }) => [
            styles.movementContent,
            pressed ? styles.movementPressed : null,
          ]}
        >
          <View style={styles.movementCopy}>
            <View style={styles.movementDateLine}>
              <Text numberOfLines={1} style={styles.movementDateLabel}>
                {movementTitle}
              </Text>
              {isActiveRecurringMovement(movement) ? (
                <MaterialCommunityIcons
                  name="repeat"
                  size={13}
                  color={colors.mutedText}
                />
              ) : null}
            </View>
            <View style={styles.movementMetaLine}>
              <MaterialCommunityIcons
                name={
                  movement.type === "income"
                    ? "arrow-up-circle-outline"
                    : movement.type === "expense"
                      ? "arrow-down-circle-outline"
                      : "swap-horizontal-circle-outline"
                }
                size={14}
                color={colors.mutedText}
              />
              <Text numberOfLines={1} style={styles.movementMeta}>
                {movementSubtitle}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.amount,
              { color: getMovementColor(colors, movement.type) },
            ]}
          >
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
            leadingIcon="information-outline"
            title="Ver"
            onPress={() => {
              setActionMenuMovementId(null);
              setInfoMovement(movement);
            }}
          />
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Editar"
            onPress={() => openEditForm(movement)}
          />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuMovementId(null);
              if (isActiveRecurringMovement(movement)) {
                setPendingRecurringScope({ kind: "delete", movement });
              } else {
                setDeleteMovement(movement);
              }
            }}
          />
        </Menu>
      </Surface>
    );
  }, [
    actionMenuMovementId,
    colors,
    data.currency,
    loadMoreMovementsForMonth,
    openEditForm,
    styles,
    toggleMovementMonth,
  ]);

  const sectionHeader = (
    <View style={styles.sectionHeaderContent}>
      {showSectionPicker ? (
        <SegmentedButtons
          value={activeSection}
          onValueChange={(value) =>
            setSelectedSection(value as FinancialSection)
          }
          buttons={[
            {
              accessibilityLabel: "Mi dinero",
              icon: "wallet-outline",
              label: "",
              value: "balance",
            },
            {
              accessibilityLabel: "Movimientos",
              icon: "swap-vertical",
              label: "",
              value: "movements",
            },
          ]}
          style={styles.segmented}
        />
      ) : null}

      <AppScreenHeader
        eyebrow={activeSection === "balance" ? "MI DINERO" : "MOVIMIENTOS"}
        helpTitle={
          activeSection === "balance"
            ? "Para qué sirve Mi dinero?"
            : "Para qué sirven los movimientos?"
        }
        helpMessage={
          activeSection === "balance"
            ? "Mi dinero junta los saldos de tus cuentas para mostrar cuánto tienes en esta libreta y en qué bolsillos está guardado."
            : "Movimientos es el rastro de huellas de tu dinero. Aquí Meowney registra ingresos, gastos y transferencias para que sepas qué pasó, cuándo pasó y en qué cuenta."
        }
      />
    </View>
  );

  const balanceFilters = (
    <View style={styles.filterSection}>
      <View style={styles.filterToggle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showBalanceFilters ? "Ocultar filtros" : "Mostrar filtros"
          }
          onPress={toggleBalanceFilters}
          style={({ pressed }) => [
            styles.filterToggleMain,
            pressed ? styles.filterTogglePressed : null,
          ]}
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
          onPress={clearBalanceFilters}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showBalanceFilters ? "Ocultar filtros" : "Mostrar filtros"
          }
          onPress={toggleBalanceFilters}
          style={({ pressed }) => [
            styles.chevronButton,
            pressed ? styles.filterTogglePressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name={showBalanceFilters ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedText}
          />
        </Pressable>
      </View>
      <AppAnimatedDisclosure
        mode="overlay"
        visible={showBalanceFilters}
        maxHeight={270}
        style={styles.movementFilterGroups}
        overlayContentStyle={styles.movementFilterPanel}
      >
        <View style={styles.movementFilterGroup}>
          <Text style={styles.movementFilterGroupLabel}>Fecha</Text>
          <View style={styles.filterGrid}>
            <View style={styles.filterControl}>
              <View style={styles.filterDateControl}>
                <Tooltip title="Fecha">
                  <IconButton
                    accessibilityLabel={`Seleccionar fecha. Fecha actual ${formatAppDate(selectedDate)}`}
                    icon="calendar-month-outline"
                    iconColor={colors.text}
                    size={20}
                    style={styles.filterDateButton}
                    onPress={() => setIsBalanceDatePickerOpen(true)}
                  />
                </Tooltip>
                <Tooltip title="Hoy">
                  <IconButton
                    accessibilityLabel="Usar fecha de hoy"
                    icon="calendar-today"
                    iconColor={colors.text}
                    size={20}
                    style={styles.filterDateButton}
                    onPress={() => updateSelectedDate(today)}
                  />
                </Tooltip>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.movementFilterGroup}>
          <Text style={styles.movementFilterGroupLabel}>Cuenta</Text>
          <View style={styles.filterGrid}>
            <FilterMenu
              colors={colors}
              icon="wallet-outline"
              label="CUENTA"
              selectedLabel={selectedBalanceAccountLabel}
              selectedValues={balanceAccountFilters}
              styles={styles}
              options={accountOptions}
              onChange={setBalanceAccountFilters}
            />
          </View>
        </View>
        <View style={styles.filterContextSpacer} />
        <Text numberOfLines={1} style={styles.filterContextText}>
          Corte: {formatAppDate(selectedDate)} · {selectedBalanceAccountLabel}
        </Text>
      </AppAnimatedDisclosure>
    </View>
  );

  const balanceContent = useMemo(() => (
    <View style={styles.scrollContentWrap}>
      <View style={styles.balanceSection}>
        <View style={styles.balanceSectionHeader}>
          <Text style={styles.balanceSectionTitle}>Dinero total</Text>
        </View>
        <AppReadOnlyRow
          icon="wallet-outline"
          iconBackgroundColor={colors.selected}
          iconColor={colors.text}
          onPress={openBalanceBreakdown}
          subtitle={formatAccountCount(visibleBalances.length)}
          title="Total"
          trailingText={formatAmount(totalBalance, data.currency)}
        />
      </View>

      <BalanceChartCarousel
        balances={visibleBalances}
        colors={colors}
        currency={data.currency}
        mode={balanceChartMode}
        selectedAccountIds={balanceAccountFilters}
        styles={styles}
        trend={data.balanceTrend}
        onNext={cycleBalanceChart}
        onPrevious={cycleBalanceChart}
      />

      <View style={styles.balanceSection}>
        <View style={styles.balanceSectionHeader}>
          <Text style={styles.balanceSectionTitle}>Cuentas</Text>
          <Text style={styles.balanceSectionMeta}>
            {visibleBalances.length}
          </Text>
        </View>
        <View style={styles.accountBalanceGrid}>
          {visibleBalances.map((account) => (
            <AppReadOnlyRow
              key={account.accountId}
              icon={
                (account.accountIcon as
                  | keyof typeof MaterialCommunityIcons.glyphMap
                  | null) ?? "wallet-outline"
              }
              iconBackgroundColor={account.accountColor ?? colors.selected}
              title={account.accountName}
              trailingText={formatAmount(account.balance, data.currency)}
            />
          ))}
        </View>
      </View>
    </View>
  ), [
    balanceChartMode,
    cycleBalanceChart,
    data.balanceTrend,
    data.currency,
    openBalanceBreakdown,
    totalBalance,
    visibleBalances,
    balanceAccountFilters,
    colors,
    styles,
  ]);

  const movementsFilters = (
    <View style={styles.filterSection}>
      <View style={styles.filterToggle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          onPress={toggleMovementFilters}
          style={({ pressed }) => [
            styles.filterToggleMain,
            pressed ? styles.filterTogglePressed : null,
          ]}
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
          onPress={clearMovementFilters}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          onPress={toggleMovementFilters}
          style={({ pressed }) => [
            styles.chevronButton,
            pressed ? styles.filterTogglePressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name={showFilters ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedText}
          />
        </Pressable>
      </View>
      <AppAnimatedDisclosure
        mode="overlay"
        visible={showFilters}
        maxHeight={340}
        style={styles.movementFilterGroups}
        overlayContentStyle={styles.movementFilterPanel}
      >
        <View style={styles.movementFilterGroup}>
          <Text style={styles.movementFilterGroupLabel}>Periodo</Text>
          <PeriodFilterMenu
            colors={colors}
            options={movementPeriodOptions}
            selectedLabel={selectedMovementPeriodLabel}
            selectedValue={movementPeriod}
            styles={styles}
            onChange={selectMovementPeriod}
          />
        </View>
        <View style={styles.movementFilterGroup}>
          <Text style={styles.movementFilterGroupLabel}>Mostrar</Text>
          <View style={styles.filterGrid}>
            <FilterMenu
              colors={colors}
              icon="swap-vertical"
              label="TIPO"
              selectedLabel={selectedTypeLabel}
              selectedValues={typeFilters}
              styles={styles}
              options={typeOptions}
              onChange={(values) => setTypeFilters(values as MovementType[])}
            />
            <FilterMenu
              colors={colors}
              icon="wallet-outline"
              label="CUENTA"
              selectedLabel={selectedAccountLabel}
              selectedValues={accountFilters}
              styles={styles}
              options={accountOptions}
              onChange={setAccountFilters}
            />
            <FilterMenu
              colors={colors}
              icon="tag-outline"
              label="CATEGORIA"
              selectedLabel={selectedCategoryLabel}
              selectedValues={categoryFilters}
              styles={styles}
              options={categoryOptions}
              onChange={updateCategoryFilters}
            />
            <SubcategoryFilterMenu
              colors={colors}
              icon="tag-multiple-outline"
              label="SUBCATEGORIA"
              groups={subcategoryGroups}
              selectedLabel={selectedSubcategoryLabel}
              selectedValues={subcategoryFilters}
              styles={styles}
              onChange={setSubcategoryFilters}
            />
          </View>
        </View>
        <View style={styles.filterContextSpacer} />
        <Text style={styles.filterContextText}>
          Periodo: {selectedMovementPeriodLabel} - Tipo: {selectedTypeLabel} -
          Cuenta: {selectedAccountLabel} - Categoria: {selectedCategoryLabel} -
          Subcategoria: {selectedSubcategoryLabel}
        </Text>
      </AppAnimatedDisclosure>
    </View>
  );

  const movementsContent = useMemo(() => (
    <View style={styles.movementsContentWrap}>
      <MovementSummaryCard
        colors={colors}
        currency={data.currency}
        isPreviousDisabled={
          movementSummaryMonth <= earliestMovementSummaryMonth
        }
        isNextDisabled={movementSummaryMonth >= latestMovementSummaryMonth}
        monthKey={movementSummaryMonth}
        range={movementSummaryRange}
        summary={movementSummary}
        styles={styles}
        onAll={showAllMovementSummary}
        onNext={showNextMovementSummaryMonth}
        onPrevious={showPreviousMovementSummaryMonth}
      />
    </View>
  ), [
    colors,
    data.currency,
    earliestMovementSummaryMonth,
    latestMovementSummaryMonth,
    movementSummary,
    movementSummaryMonth,
    movementSummaryRange,
    showAllMovementSummary,
    showNextMovementSummaryMonth,
    showPreviousMovementSummaryMonth,
    styles,
  ]);

  const listHeaderComponent = useMemo(
    () => (activeSection === "balance" ? balanceContent : movementsContent),
    [activeSection, balanceContent, movementsContent],
  );

  const fixedHeader = (
    <View style={styles.fixedHeaderContent}>
      {sectionHeader}
      {activeSection === "balance" ? balanceFilters : movementsFilters}
    </View>
  );

  if (!selectedNotebookId) {
    return (
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.container}>
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para revisar tus saldos y rastros."
            style={styles.emptyPanel}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.container}>
        {fixedHeader}
        <FlatList
          data={activeSection === "movements" ? movementRows : []}
          keyExtractor={movementKeyExtractor}
          renderItem={renderMovementRow}
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={renderMovementSeparator}
          ListEmptyComponent={renderMovementEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
        {activeSection === "movements" ? (
          <AppBottomActionDrawer
            contentStyle={styles.bottomActionContent}
            style={styles.bottomAction}
            onClose={closeCreateMenu}
          >
            {isCreateMenuMounted ? (
              <Animated.View
                style={[styles.fabMenuWrap, createMenuAnimatedStyle]}
              >
                <Surface style={styles.fabMenu} elevation={0}>
                  <FabOption
                    colors={colors}
                    icon="arrow-up-circle-outline"
                    label="Registrar ingreso"
                    styles={styles}
                    onPress={() => openCreateForm("income")}
                  />
                  <FabOption
                    colors={colors}
                    icon="arrow-down-circle-outline"
                    label="Registrar gasto"
                    styles={styles}
                    onPress={() => openCreateForm("expense")}
                  />
                  <FabOption
                    colors={colors}
                    icon="swap-horizontal-circle-outline"
                    label="Mover entre cuentas"
                    styles={styles}
                    onPress={() => openCreateForm("transfer")}
                  />
                </Surface>
              </Animated.View>
            ) : null}
            <AppCatFab
              accessibilityLabel={
                createMenuOpen
                  ? "Cerrar opciones de movimiento"
                  : "Crear movimiento"
              }
              label="Crear movimiento"
              style={styles.addButton}
              onPress={createMenuOpen ? closeCreateMenu : openCreateMenu}
            />
          </AppBottomActionDrawer>
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
          showRecurrenceError={showRecurrenceError}
          styles={styles}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onOpenDatePicker={() => setIsDatePickerOpen(true)}
          onOpenRecurrenceEndDatePicker={() =>
            setIsRecurrenceEndDatePickerOpen(true)
          }
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
            setFormValues((current) => ({
              ...current,
              dateKey,
              recurrenceEndDateKey:
                current.recurrenceEndDateKey < dateKey
                  ? dateKey
                  : current.recurrenceEndDateKey,
            }));
            setIsDatePickerOpen(false);
          }}
        />
        <AppDatePickerDialog
          selectedDate={formValues.recurrenceEndDateKey}
          today={today}
          visible={isRecurrenceEndDatePickerOpen}
          onDismiss={() => setIsRecurrenceEndDatePickerOpen(false)}
          onSelect={(dateKey) => {
            setFormValues((current) => ({
              ...current,
              recurrenceEndDateKey: dateKey,
            }));
            setIsRecurrenceEndDatePickerOpen(false);
          }}
        />
        <AppDatePickerDialog
          selectedDate={
            customPeriodPickerTarget === "end"
              ? customPeriodEnd
              : customPeriodStart
          }
          today={today}
          visible={customPeriodPickerTarget !== null}
          onDismiss={() => setCustomPeriodPickerTarget(null)}
          onSelect={(dateKey) => {
            if (customPeriodPickerTarget === "start") {
              setCustomPeriodStart(dateKey);
              setCustomPeriodPickerTarget("end");
              return;
            }

            setCustomPeriodEnd(dateKey);
            setMovementSummaryRange("all");
            setCustomPeriodPickerTarget(null);
          }}
        />
        <AppContentDialog
          visible={Boolean(infoMovement)}
          title="Detalle"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoMovement(null)}
          onDismiss={() => setInfoMovement(null)}
        >
          {infoMovement ? (
            <>
              <AppInfoLine
                label="Tipo"
                value={getMovementLabel(infoMovement.type)}
              />
              <AppInfoLine
                label="Monto"
                value={getSignedAmount(
                  infoMovement.type,
                  infoMovement.amount,
                  data.currency,
                )}
              />
              <AppInfoLine
                label="Fecha"
                value={formatMovementTitleDate(infoMovement.occurredAt)}
              />
              <AppInfoLine label="Cuenta" value={infoMovement.accountName} />
              {infoMovement.toAccountName ? (
                <AppInfoLine
                  label="Destino"
                  value={infoMovement.toAccountName}
                />
              ) : null}
              <AppInfoLine
                label="Categoria"
                value={infoMovement.categoryName ?? "Transferencia"}
              />
              <AppInfoLine
                label="Descripción"
                value={infoMovement.description || "Sin descripción"}
              />
              {isActiveRecurringMovement(infoMovement) ? (
                <AppInfoLine
                  label="Recurrencia"
                  value="Movimiento recurrente"
                />
              ) : null}
            </>
          ) : null}
        </AppContentDialog>
        <RecurringMovementScopeDialog
          colors={colors}
          pendingScope={pendingRecurringScope}
          styles={styles}
          onCancel={() => setPendingRecurringScope(null)}
          onSelect={applyRecurringScope}
        />
        <AppConfirmDialog
          visible={Boolean(deleteMovement)}
          title="Eliminar movimiento"
          message="Esta acción archivará el movimiento y dejará de mostrarse."
          onCancel={() => setDeleteMovement(null)}
          onConfirm={confirmDelete}
        />
      </Portal>
      <AppMeowneySnackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </SafeAreaView>
  );
}

type RecurringMovementScopeDialogProps = {
  colors: MeowneyColors;
  pendingScope: PendingRecurringScope | null;
  styles: ReturnType<typeof createStyles>;
  onCancel: () => void;
  onSelect: (scope: RecurringScope) => void;
};

function RecurringMovementScopeDialog({
  colors,
  pendingScope,
  styles,
  onCancel,
  onSelect,
}: RecurringMovementScopeDialogProps) {
  const isEdit = pendingScope?.kind === "edit";

  return (
    <Dialog
      visible={Boolean(pendingScope)}
      onDismiss={onCancel}
      style={styles.scopeDialog}
    >
      <Dialog.Title style={styles.scopeDialogTitle}>
        {isEdit ? "Editar recurrencia" : "Eliminar recurrencia"}
      </Dialog.Title>
      <Dialog.Content>
        <Text style={styles.scopeDialogText}>
          Este movimiento pertenece a una serie recurrente. Puedes aplicar la
          acción solo a este movimiento, o a este y los futuros que sigan dentro
          de la serie.
        </Text>
        <Text style={styles.scopeDialogHint}>
          Si eliges solo este, dejara de recibir cambios futuros de la
          recurrencia. Los movimientos ya separados no se modificaran.
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onCancel}>Cancelar</Button>
        <Button textColor={colors.mutedText} onPress={() => onSelect("single")}>
          Solo este
        </Button>
        <Button
          textColor={isEdit ? colors.success : colors.error}
          onPress={() => onSelect("future")}
        >
          Este y futuros
        </Button>
      </Dialog.Actions>
    </Dialog>
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fabOption, pressed && styles.pressed]}
    >
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
  showRecurrenceError: boolean;
  styles: ReturnType<typeof createStyles>;
  values: MovementFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: MovementFormValues) => void;
  onOpenDatePicker: () => void;
  onOpenRecurrenceEndDatePicker: () => void;
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
  showRecurrenceError,
  styles,
  values,
  visible,
  onCancel,
  onChange,
  onOpenDatePicker,
  onOpenRecurrenceEndDatePicker,
  onSave,
}: MovementFormDialogProps) {
  const formScrollRef = useRef<ScrollView>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [budgetMenuOpen, setBudgetMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [subcategoryMenuOpen, setSubcategoryMenuOpen] = useState(false);
  const [fromMenuOpen, setFromMenuOpen] = useState(false);
  const [frequencyMenuOpen, setFrequencyMenuOpen] = useState(false);
  const [toMenuOpen, setToMenuOpen] = useState(false);
  const isTransfer = mode === "transfer";
  const canUseRecurrence = !editing && !isTransfer;
  const selectedAccount = accounts.find(
    (account) => account.id === values.accountId,
  );
  const categoryType =
    mode === "income" || mode === "expense" ? mode : "expense";
  const categoryOptions = getPrimaryCategories(categories, categoryType);
  const selectedCategory = categories.find(
    (category) => category.id === values.categoryId,
  );
  const selectedParentCategory = getSelectedParentCategory(
    categories,
    values.categoryId,
  );
  const selectedSubcategory = getSelectedSubcategory(
    categories,
    values.categoryId,
  );
  const subcategoryOptions = getSubcategories(
    categories,
    selectedParentCategory?.id,
  );
  const budgetOptions = budgets.filter(
    (budget) => budget.categoryId === values.categoryId,
  );
  const selectedBudget = budgets.find(
    (budget) => budget.id === values.budgetId,
  );
  const fromAccount = accounts.find(
    (account) => account.id === values.fromAccountId,
  );
  const toAccount = accounts.find(
    (account) => account.id === values.toAccountId,
  );
  const parsedAmount = parseAmount(values.amount) ?? 0;
  const spentAmount = selectedBudget
    ? budgetRepository.getSpentAmount(selectedBudget.id)
    : 0;
  const remainingAmount = selectedBudget
    ? selectedBudget.amount - spentAmount - parsedAmount
    : null;

  return (
    <AppFormDialog
      visible={visible}
      title={
        editing
          ? isTransfer
            ? "Editar transferencia"
            : mode === "income"
              ? "Editar ingreso"
              : "Editar gasto"
          : isTransfer
            ? "Mover entre cuentas"
            : mode === "income"
              ? "Registrar ingreso"
              : "Registrar gasto"
      }
      contentContainerStyle={styles.form}
      scrollRef={formScrollRef}
      titleIcon={getMovementIcon(mode)}
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
          placeholder="Ej. 250"
          keyboardType="decimal-pad"
          value={values.amount}
          onChangeText={(amount) => onChange({ ...values, amount })}
          error={showAmountError}
        />
        {showAmountError ? (
          <HelperText type="error" visible>
            Escribe un monto mayor a cero.
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
            selectedLabel={fromAccount?.name ?? "Seleccionar cuenta"}
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
            selectedLabel={toAccount?.name ?? "Seleccionar cuenta"}
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
            selectedLabel={selectedAccount?.name ?? "Seleccionar cuenta"}
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
            label="CATEGORIA"
            menuOpen={categoryMenuOpen}
            selectedLabel={
              selectedParentCategory?.name ?? "Seleccionar categoría"
            }
            styles={styles}
            onDismiss={() => setCategoryMenuOpen(false)}
            onOpen={() => setCategoryMenuOpen(true)}
            onSelect={(categoryId) => {
              onChange({ ...values, categoryId, budgetId: "" });
              setCategoryMenuOpen(false);
            }}
          />
          {subcategoryOptions.length > 0 ? (
            <CategoryMenu
              categories={subcategoryOptions}
              colors={colors}
              emptyValue={selectedParentCategory?.id}
              emptyLabel="Sin subcategoría"
              label="SUBCATEGORIA"
              menuOpen={subcategoryMenuOpen}
              selectedLabel={selectedSubcategory?.name ?? "Sin subcategoría"}
              styles={styles}
              onDismiss={() => setSubcategoryMenuOpen(false)}
              onOpen={() => setSubcategoryMenuOpen(true)}
              onSelect={(categoryId) => {
                onChange({ ...values, categoryId, budgetId: "" });
                setSubcategoryMenuOpen(false);
              }}
            />
          ) : null}
          {mode === "expense" ? (
            <>
              <BudgetMenu
                budgets={budgetOptions}
                colors={colors}
                menuOpen={budgetMenuOpen}
                selectedLabel={
                  selectedBudget?.categoryName ?? "Sin presupuesto"
                }
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
                      remainingAmount !== null &&
                        remainingAmount < 0 &&
                        styles.budgetRemainingNegative,
                    ]}
                  >
                    Quedaría {formatAmount(remainingAmount ?? 0, currency)}
                  </Text>
                </Surface>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {showAccountError ? (
        <HelperText type="error" visible>
          {isTransfer
            ? "Elige una cuenta de origen y otra de destino."
            : "Elige la cuenta y la categoría del movimiento."}
        </HelperText>
      ) : null}

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <AppDescriptionInput
          placeholder={
            isTransfer
              ? "Ej. Pasé dinero a ahorros"
              : "Ej. Supermercado, nómina o gasolina"
          }
          value={values.description}
          onChangeText={(description) => onChange({ ...values, description })}
        />
      </View>

      {canUseRecurrence ? (
        <View style={styles.recurrenceSection}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: values.isRecurring }}
            onPress={() =>
              onChange({
                ...values,
                isRecurring: !values.isRecurring,
                recurrenceEndDateKey:
                  values.recurrenceEndDateKey < values.dateKey
                    ? values.dateKey
                    : values.recurrenceEndDateKey,
              })
            }
            style={({ pressed }) => [
              styles.recurrenceToggle,
              pressed && styles.pressed,
            ]}
          >
            <Checkbox.Android
              status={values.isRecurring ? "checked" : "unchecked"}
              color={colors.primary}
              uncheckedColor={colors.mutedText}
            />
            <Text style={styles.recurrenceToggleTitle}>
              Movimiento recurrente
            </Text>
          </Pressable>

          <AppAnimatedDisclosure
            visible={values.isRecurring}
            maxHeight={360}
            style={styles.recurrenceDisclosure}
          >
            <RecurrenceFrequencyMenu
              colors={colors}
              menuOpen={frequencyMenuOpen}
              selectedValue={values.recurrenceFrequency}
              styles={styles}
              onDismiss={() => setFrequencyMenuOpen(false)}
              onOpen={() => setFrequencyMenuOpen(true)}
              onSelect={(recurrenceFrequency) => {
                onChange({ ...values, recurrenceFrequency });
                setFrequencyMenuOpen(false);
              }}
            />

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>CADA CUANTO</Text>
              <View style={styles.recurrenceIntervalRow}>
                <TextInput
                  mode="outlined"
                  dense
                  keyboardType="number-pad"
                  value={values.recurrenceInterval}
                  onChangeText={(recurrenceInterval) =>
                    onChange({ ...values, recurrenceInterval })
                  }
                  style={styles.recurrenceIntervalInput}
                />
                <Text style={styles.recurrenceIntervalLabel}>
                  {getRecurrenceIntervalLabel(values.recurrenceFrequency)}
                </Text>
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>HASTA CUANDO</Text>
              <AppDateInput
                value={values.recurrenceEndDateKey}
                onOpen={onOpenRecurrenceEndDatePicker}
              />
            </View>

            {showRecurrenceError ? (
              <HelperText type="error" visible>
                Usa un intervalo mayor a cero y una fecha final igual o
                posterior.
              </HelperText>
            ) : null}
          </AppAnimatedDisclosure>
        </View>
      ) : null}
    </AppFormDialog>
  );
}

function getRecurrenceFrequencyLabel(value: RecurrenceFrequency) {
  if (value === "daily") {
    return "Diario";
  }

  if (value === "weekly") {
    return "Semanal";
  }

  if (value === "monthly") {
    return "Mensual";
  }

  return "Anual";
}

function getRecurrenceIntervalLabel(value: RecurrenceFrequency) {
  if (value === "daily") {
    return "día(s)";
  }

  if (value === "weekly") {
    return "semana(s)";
  }

  if (value === "monthly") {
    return "mes(es)";
  }

  return "año(s)";
}

type RecurrenceFrequencyMenuProps = {
  colors: MeowneyColors;
  menuOpen: boolean;
  selectedValue: RecurrenceFrequency;
  styles: ReturnType<typeof createStyles>;
  onDismiss: () => void;
  onOpen: () => void;
  onSelect: (value: RecurrenceFrequency) => void;
};

function RecurrenceFrequencyMenu({
  colors,
  menuOpen,
  selectedValue,
  styles,
  onDismiss,
  onOpen,
  onSelect,
}: RecurrenceFrequencyMenuProps) {
  const options: RecurrenceFrequency[] = [
    "daily",
    "weekly",
    "monthly",
    "yearly",
  ];

  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>FRECUENCIA</Text>
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
            {getRecurrenceFrequencyLabel(selectedValue)}
          </Button>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option}
            title={getRecurrenceFrequencyLabel(option)}
            onPress={() => onSelect(option)}
          />
        ))}
      </Menu>
    </View>
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
          <Menu.Item
            key={account.id}
            title={account.name}
            onPress={() => onSelect(account.id)}
          />
        ))}
      </Menu>
    </View>
  );
}

type CategoryMenuProps = {
  categories: Category[];
  colors: MeowneyColors;
  emptyLabel?: string;
  emptyValue?: string;
  label: string;
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
  emptyLabel,
  emptyValue,
  label,
  menuOpen,
  selectedLabel,
  styles,
  onDismiss,
  onOpen,
  onSelect,
}: CategoryMenuProps) {
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
        {emptyLabel && emptyValue ? (
          <Menu.Item title={emptyLabel} onPress={() => onSelect(emptyValue)} />
        ) : null}
        {categories.map((category) => (
          <Menu.Item
            key={category.id}
            title={
              getCategoryDisplayName(categories, category) || category.name
            }
            onPress={() => onSelect(category.id)}
          />
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
        <Menu.Item title="Sin presupuesto" onPress={() => onSelect("")} />
        {budgets.map((budget) => (
          <Menu.Item
            key={budget.id}
            title={budget.categoryName}
            onPress={() => onSelect(budget.id)}
          />
        ))}
      </Menu>
    </View>
  );
}

type FilterOption = {
  label: string;
  value: string;
};

type SubcategoryFilterGroup = {
  category: FilterOption;
  subcategories: FilterOption[];
};

type PeriodFilterMenuProps = {
  colors: MeowneyColors;
  options: FilterOption[];
  selectedLabel: string;
  selectedValue: MovementPeriod;
  styles: ReturnType<typeof createStyles>;
  onChange: (value: MovementPeriod) => void;
};

function PeriodFilterMenu({
  colors,
  options,
  selectedLabel,
  selectedValue,
  styles,
  onChange,
}: PeriodFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.filterControl}>
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentStyle={styles.menuContent}
        anchor={
          <Tooltip title="Periodo">
            <IconButton
              accessibilityLabel={`PERIODO. ${selectedLabel}`}
              icon="calendar-range-outline"
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
            leadingIcon={selectedValue === option.value ? "check" : undefined}
            title={option.label}
            onPress={() => {
              onChange(option.value as MovementPeriod);
              setIsOpen(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

type MovementSummary = {
  expense: number;
  income: number;
  total: number;
  transfer: number;
};

type MovementSummaryCardProps = {
  colors: MeowneyColors;
  currency: string;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  monthKey: string;
  range: MovementSummaryRange;
  summary: MovementSummary;
  styles: ReturnType<typeof createStyles>;
  onAll: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

function MovementSummaryCard({
  colors,
  currency,
  isPreviousDisabled,
  isNextDisabled,
  monthKey,
  range,
  summary,
  styles,
  onAll,
  onNext,
  onPrevious,
}: MovementSummaryCardProps) {
  const periodLabel =
    range === "all" ? "Todos" : formatMovementMonth(`${monthKey}-01`);
  const totalLabel =
    summary.total === 1 ? "1 movimiento" : `${summary.total} movimientos`;

  return (
    <View style={styles.balanceSection}>
      <View style={styles.balanceSectionHeader}>
        <Text style={styles.balanceSectionTitle}>Actividad general</Text>
        <View style={styles.balanceChartControls}>
          <IconButton
            accessibilityLabel="Periodo anterior"
            disabled={isPreviousDisabled}
            icon="chevron-left"
            iconColor={isPreviousDisabled ? colors.disabled : colors.mutedText}
            size={18}
            style={[styles.chevronButton, styles.balanceChartButton]}
            onPress={onPrevious}
          />
          <IconButton
            accessibilityLabel="Ver todos los movimientos"
            icon="calendar-multiselect"
            iconColor={range === "all" ? colors.onPrimary : colors.mutedText}
            size={18}
            style={[
              styles.chevronButton,
              styles.balanceChartButton,
              range === "all" ? styles.movementSummaryAllButtonSelected : null,
            ]}
            onPress={onAll}
          />
          <IconButton
            accessibilityLabel="Periodo siguiente"
            disabled={isNextDisabled}
            icon="chevron-right"
            iconColor={isNextDisabled ? colors.disabled : colors.mutedText}
            size={18}
            style={[styles.chevronButton, styles.balanceChartButton]}
            onPress={onNext}
          />
        </View>
      </View>
      <Surface style={styles.movementSummaryCard} elevation={0}>
        <Text style={styles.movementSummaryTotalLabel}>
          {periodLabel} · {totalLabel}
        </Text>
        <View style={styles.movementSummaryGrid}>
          <MovementSummaryStat
            icon="arrow-up-circle-outline"
            iconColor={getMovementColor(colors, "income")}
            label="Ingresos"
            styles={styles}
            value={formatAmount(summary.income, currency)}
          />
          <MovementSummaryStat
            icon="arrow-down-circle-outline"
            iconColor={getMovementColor(colors, "expense")}
            label="Gastos"
            styles={styles}
            value={formatAmount(summary.expense, currency)}
          />
          <MovementSummaryStat
            icon="swap-horizontal-circle-outline"
            iconColor={getMovementColor(colors, "transfer")}
            label="Traspasos"
            fullWidth
            styles={styles}
            value={formatAmount(summary.transfer, currency)}
          />
        </View>
      </Surface>
    </View>
  );
}

type MovementSummaryStatProps = {
  fullWidth?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
  value: string;
};

function MovementSummaryStat({
  fullWidth = false,
  icon,
  iconColor,
  label,
  styles,
  value,
}: MovementSummaryStatProps) {
  return (
    <View
      style={[
        styles.movementSummaryStat,
        fullWidth ? styles.movementSummaryStatFullWidth : null,
      ]}
    >
      <View style={styles.movementSummaryStatHeader}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        <Text numberOfLines={1} style={styles.movementSummaryStatLabel}>
          {label}
        </Text>
      </View>
      <View style={styles.movementSummaryStatCopy}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.movementSummaryStatValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

type BalanceChartCarouselProps = {
  balances: AccountBalance[];
  colors: MeowneyColors;
  currency: string;
  mode: BalanceChartMode;
  selectedAccountIds: string[];
  styles: ReturnType<typeof createStyles>;
  trend: BalanceTrendPoint[];
  onNext: () => void;
  onPrevious: () => void;
};

function BalanceChartCarousel({
  balances,
  colors,
  currency,
  mode,
  selectedAccountIds,
  styles,
  trend,
  onNext,
  onPrevious,
}: BalanceChartCarouselProps) {
  const title = mode === "distribution" ? "Distribución" : "Evolución";

  return (
    <View style={styles.balanceSection}>
      <View style={styles.balanceSectionHeader}>
        <Text style={styles.balanceSectionTitle}>{title}</Text>
        <View style={styles.balanceChartControls}>
          <IconButton
            accessibilityLabel="Gráfica anterior"
            icon="chevron-left"
            iconColor={colors.mutedText}
            size={18}
            style={[styles.chevronButton, styles.balanceChartButton]}
            onPress={onPrevious}
          />
          <IconButton
            accessibilityLabel="Gráfica siguiente"
            icon="chevron-right"
            iconColor={colors.mutedText}
            size={18}
            style={[styles.chevronButton, styles.balanceChartButton]}
            onPress={onNext}
          />
        </View>
      </View>
      <Surface style={styles.distributionCard} elevation={0}>
        {mode === "distribution" ? (
          <BalanceDistributionChart
            balances={balances}
            colors={colors}
            styles={styles}
          />
        ) : (
          <BalanceTrendChart
            colors={colors}
            selectedAccountIds={selectedAccountIds}
            styles={styles}
            trend={trend}
          />
        )}
      </Surface>
    </View>
  );
}

type BalanceDistributionChartProps = {
  balances: AccountBalance[];
  colors: MeowneyColors;
  styles: ReturnType<typeof createStyles>;
};

type DistributionChartItem = {
  color: string;
  id: string;
  label: string;
  value: number;
};

type DistributionTreemapTile = {
  height: number;
  item: DistributionChartItem;
  percentage: number;
  width: number;
  x: number;
  y: number;
};

function BalanceDistributionChart({
  balances,
  colors,
  styles,
}: BalanceDistributionChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const distribution = balances
    .filter((account) => account.balance > 0)
    .map((account, index) => ({
      color:
        account.accountColor ?? getFallbackDistributionColor(colors, index),
      id: account.accountId,
      label: account.accountName,
      value: account.balance,
    }));
  const total = distribution.reduce((sum, account) => sum + account.value, 0);
  const chartHeight = BALANCE_CHART_CONTENT_HEIGHT;
  const tiles =
    chartWidth > 0
      ? buildDistributionTreemap(distribution, chartWidth, chartHeight, total)
      : [];

  if (total <= 0) {
    return (
      <View style={styles.distributionChartFrame}>
        <Text style={styles.distributionEmpty}>
          Agrega saldo a tus cuentas para ver la distribución.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.distributionChartFrame}
      onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
    >
      {tiles.map((tile) => {
        const showName = tile.width >= 88 && tile.height >= 48;
        const showPercentage = tile.width >= 46 && tile.height >= 28;
        const textColor = getReadableChartTextColor(tile.item.color, colors);

        return (
          <View
            key={tile.item.id}
            style={[
              styles.distributionTreemapTile,
              {
                backgroundColor: tile.item.color,
                height: Math.max(0, tile.height - 2),
                left: tile.x + 1,
                top: tile.y + 1,
                width: Math.max(0, tile.width - 2),
              },
            ]}
          >
            {showName ? (
              <>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.distributionTreemapTitle,
                    { color: textColor },
                  ]}
                >
                  {tile.item.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.distributionTreemapPercent,
                    { color: textColor },
                  ]}
                >
                  {tile.percentage}%
                </Text>
              </>
            ) : showPercentage ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.distributionTreemapPercent,
                  { color: textColor },
                ]}
              >
                {tile.percentage}%
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function buildDistributionTreemap(
  items: DistributionChartItem[],
  width: number,
  height: number,
  total: number,
): DistributionTreemapTile[] {
  const sortedItems = [...items].sort(
    (first, second) => second.value - first.value,
  );

  function buildTiles(
    currentItems: DistributionChartItem[],
    x: number,
    y: number,
    currentWidth: number,
    currentHeight: number,
  ): DistributionTreemapTile[] {
    if (currentItems.length === 0 || currentWidth <= 0 || currentHeight <= 0) {
      return [];
    }

    if (currentItems.length === 1) {
      const [item] = currentItems;

      return [
        {
          height: currentHeight,
          item,
          percentage: Math.round((item.value / total) * 100),
          width: currentWidth,
          x,
          y,
        },
      ];
    }

    const groupTotal = currentItems.reduce((sum, item) => sum + item.value, 0);
    const [firstGroup, secondGroup] = splitDistributionItems(
      currentItems,
      groupTotal,
    );
    const firstGroupTotal = firstGroup.reduce(
      (sum, item) => sum + item.value,
      0,
    );

    if (currentWidth >= currentHeight) {
      const firstWidth = (currentWidth * firstGroupTotal) / groupTotal;

      return [
        ...buildTiles(firstGroup, x, y, firstWidth, currentHeight),
        ...buildTiles(
          secondGroup,
          x + firstWidth,
          y,
          currentWidth - firstWidth,
          currentHeight,
        ),
      ];
    }

    const firstHeight = (currentHeight * firstGroupTotal) / groupTotal;

    return [
      ...buildTiles(firstGroup, x, y, currentWidth, firstHeight),
      ...buildTiles(
        secondGroup,
        x,
        y + firstHeight,
        currentWidth,
        currentHeight - firstHeight,
      ),
    ];
  }

  return buildTiles(sortedItems, 0, 0, width, height);
}

function splitDistributionItems(items: DistributionChartItem[], total: number) {
  const firstGroup: DistributionChartItem[] = [];
  let firstTotal = 0;

  for (const item of items) {
    if (firstGroup.length === 0) {
      firstGroup.push(item);
      firstTotal += item.value;
      continue;
    }

    const currentDifference = Math.abs(total / 2 - firstTotal);
    const nextDifference = Math.abs(total / 2 - (firstTotal + item.value));

    if (nextDifference <= currentDifference) {
      firstGroup.push(item);
      firstTotal += item.value;
      continue;
    }

    break;
  }

  if (firstGroup.length === items.length) {
    firstGroup.pop();
  }

  const firstIds = new Set(firstGroup.map((item) => item.id));
  const secondGroup = items.filter((item) => !firstIds.has(item.id));

  return [firstGroup, secondGroup] as const;
}

function getReadableChartTextColor(
  backgroundColor: string,
  colors: MeowneyColors,
) {
  const hex = backgroundColor.replace("#", "");

  if (!/^[\da-f]{6}$/i.test(hex)) {
    return colors.void;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;

  return luminance > 0.58 ? colors.void : colors.pure;
}

type BalanceTrendChartProps = {
  colors: MeowneyColors;
  selectedAccountIds: string[];
  styles: ReturnType<typeof createStyles>;
  trend: BalanceTrendPoint[];
};

function BalanceTrendChart({
  colors,
  selectedAccountIds,
  styles,
  trend,
}: BalanceTrendChartProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const points = trend.map((point) => {
    const visibleBalances =
      selectedAccountIds.length === 0
        ? point.balances
        : point.balances.filter((account) =>
            selectedAccountIds.includes(account.accountId),
          );

    return {
      ...point,
      total: visibleBalances.reduce((sum, account) => sum + account.balance, 0),
    };
  });
  const rawMinTotal = Math.min(0, ...points.map((point) => point.total));
  const rawMaxTotal = Math.max(0, ...points.map((point) => point.total));
  const range = rawMaxTotal === rawMinTotal ? 1 : rawMaxTotal - rawMinTotal;
  const yLabels = [rawMaxTotal, rawMinTotal + range / 2, rawMinTotal];
  const plotHeight = BALANCE_TREND_PLOT_HEIGHT;
  const plotHorizontalPadding = spacing.xl;
  const plottedPoints = points.map((point, index) => {
    const availableWidth = Math.max(1, plotWidth - plotHorizontalPadding * 2);
    const x =
      points.length === 1
        ? plotWidth / 2
        : plotHorizontalPadding +
          (index / (points.length - 1)) * availableWidth;
    const y = ((rawMaxTotal - point.total) / range) * (plotHeight - 12) + 6;

    return { ...point, x, y };
  });

  if (points.length === 0) {
    return (
      <Text style={styles.distributionEmpty}>
        Aún no hay datos para mostrar la evolución.
      </Text>
    );
  }

  return (
    <View style={styles.trendChart}>
      <View
        style={styles.trendPlot}
        onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
      >
        <View style={[styles.trendGridLine, styles.trendGridLineTop]} />
        <View style={[styles.trendGridLine, styles.trendGridLineMiddle]} />
        <View style={[styles.trendGridLine, styles.trendGridLineBottom]} />
        <View style={styles.trendYAxisOverlay}>
          {yLabels.map((label, index) => (
            <Text
              key={`${label}_${index}`}
              numberOfLines={1}
              style={styles.trendAxisLabel}
            >
              {formatCompactAmount(label)}
            </Text>
          ))}
        </View>
        {plotWidth > 0
          ? plottedPoints
              .slice(0, -1)
              .map((point, index) => (
                <TrendLineSegment
                  key={`${point.dateKey}_${plottedPoints[index + 1].dateKey}`}
                  color={colors.primary}
                  fromX={point.x}
                  fromY={point.y}
                  styles={styles}
                  toX={plottedPoints[index + 1].x}
                  toY={plottedPoints[index + 1].y}
                />
              ))
          : null}
        {plotWidth > 0
          ? plottedPoints.map((point) => (
              <View
                key={point.dateKey}
                style={[
                  styles.trendPoint,
                  {
                    backgroundColor: colors.primary,
                    left: point.x - 5,
                    top: point.y - 5,
                  },
                ]}
              />
            ))
          : null}
      </View>
      <View style={styles.trendXAxis}>
        <View style={styles.trendXAxisLabels}>
          {points.map((point) => (
            <Text key={point.dateKey} style={styles.trendLabel}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

type TrendLineSegmentProps = {
  color: string;
  fromX: number;
  fromY: number;
  styles: ReturnType<typeof createStyles>;
  toX: number;
  toY: number;
};

function TrendLineSegment({
  color,
  fromX,
  fromY,
  styles,
  toX,
  toY,
}: TrendLineSegmentProps) {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = `${Math.atan2(deltaY, deltaX)}rad`;

  if (
    !Number.isFinite(length) ||
    !Number.isFinite(fromX) ||
    !Number.isFinite(fromY) ||
    !Number.isFinite(toX) ||
    !Number.isFinite(toY)
  ) {
    return null;
  }

  return (
    <View
      style={[
        styles.trendLineSegment,
        {
          backgroundColor: color,
          left: (fromX + toX) / 2 - length / 2,
          top: (fromY + toY) / 2 - 1.5,
          transform: [{ rotate: angle }],
          width: length,
        },
      ]}
    />
  );
}

function getFallbackDistributionColor(colors: MeowneyColors, index: number) {
  return [
    colors.irisGleam,
    colors.cyanSignal,
    colors.orchidBloom,
    colors.periwinkle,
    colors.paleIris,
  ][index % 5];
}

type FilterMenuProps = {
  colors: MeowneyColors;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  options: FilterOption[];
  selectedLabel: string;
  selectedValues: string[];
  styles: ReturnType<typeof createStyles>;
  onChange: (values: string[]) => void;
};

function FilterMenu({
  colors,
  icon,
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
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentStyle={styles.menuContent}
        anchor={
          <Tooltip title={formatFilterTooltip(label)}>
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
        <Menu.Item
          leadingIcon={selectedValues.length === 0 ? "check" : undefined}
          title="Todos"
          onPress={() => onChange([])}
        />
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            leadingIcon={
              selectedValues.includes(option.value) ? "check" : undefined
            }
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

type SubcategoryFilterMenuProps = {
  colors: MeowneyColors;
  groups: SubcategoryFilterGroup[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  selectedLabel: string;
  selectedValues: string[];
  styles: ReturnType<typeof createStyles>;
  onChange: (values: string[]) => void;
};

function SubcategoryFilterMenu({
  colors,
  groups,
  icon,
  label,
  selectedLabel,
  selectedValues,
  styles,
  onChange,
}: SubcategoryFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValueSet = new Set(selectedValues);

  const toggleSubcategory = (value: string) => {
    onChange(
      selectedValueSet.has(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    );
  };

  const toggleGroup = (values: string[]) => {
    const allSelected = values.every((value) => selectedValueSet.has(value));

    onChange(
      allSelected
        ? selectedValues.filter(
            (selectedValue) => !values.includes(selectedValue),
          )
        : Array.from(new Set([...selectedValues, ...values])),
    );
  };

  return (
    <View style={styles.filterControl}>
      <Menu
        visible={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentStyle={styles.menuContent}
        anchor={
          <Tooltip title={formatFilterTooltip(label)}>
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
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange([])}
          style={({ pressed }) => [
            styles.groupedMenuItem,
            pressed ? styles.groupedMenuItemPressed : null,
          ]}
        >
          <View style={styles.groupedMenuIconSlot}>
            {selectedValues.length === 0 ? (
              <MaterialCommunityIcons
                name="check"
                color={colors.text}
                size={20}
              />
            ) : null}
          </View>
          <Text style={styles.groupedMenuText}>Todos</Text>
        </Pressable>
        {groups.map((group) => {
          const groupValues = group.subcategories.map((option) => option.value);
          const allSelected = groupValues.every((value) =>
            selectedValueSet.has(value),
          );
          const someSelected = groupValues.some((value) =>
            selectedValueSet.has(value),
          );

          return (
            <Fragment key={group.category.value}>
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleGroup(groupValues)}
                style={({ pressed }) => [
                  styles.groupedMenuItem,
                  pressed ? styles.groupedMenuItemPressed : null,
                ]}
              >
                <View style={styles.groupedMenuIconSlot}>
                  {allSelected || someSelected ? (
                    <MaterialCommunityIcons
                      name={allSelected ? "check" : "minus"}
                      color={colors.text}
                      size={20}
                    />
                  ) : null}
                </View>
                <Text style={styles.groupedMenuCategoryText}>
                  {group.category.label}
                </Text>
              </Pressable>
              {group.subcategories.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => toggleSubcategory(option.value)}
                  style={({ pressed }) => [
                    styles.groupedMenuItem,
                    styles.groupedSubcategoryMenuItem,
                    pressed ? styles.groupedMenuItemPressed : null,
                  ]}
                >
                  <View style={styles.groupedMenuIconSlot}>
                    {selectedValueSet.has(option.value) ? (
                      <MaterialCommunityIcons
                        name="check"
                        color={colors.text}
                        size={20}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.groupedMenuText}>{option.label}</Text>
                </Pressable>
              ))}
            </Fragment>
          );
        })}
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
    fixedHeaderContent: {
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    scrollContentWrap: {
      gap: spacing.lg,
    },
    movementsContentWrap: {
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    sectionHeaderContent: {
      gap: spacing.md,
    },
    segmented: {
      backgroundColor: colors.background,
    },
    balanceSection: {
      gap: spacing.sm,
    },
    balanceSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    balanceChartControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    chevronButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    balanceChartButton: {
      margin: 0,
    },
    movementSummaryAllButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    movementSummaryCard: {
      gap: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    movementSummaryTotalLabel: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
      lineHeight: 20,
    },
    movementSummaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    movementSummaryStat: {
      width: "48%",
      minWidth: 0,
      minHeight: 68,
      alignItems: "flex-start",
      justifyContent: "center",
      gap: spacing.xs,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.input,
      backgroundColor: colors.selected,
    },
    movementSummaryStatFullWidth: {
      width: "100%",
    },
    movementSummaryStatHeader: {
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    movementSummaryStatCopy: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
    },
    movementSummaryStatLabel: {
      color: colors.mutedText,
      fontSize: 10,
      fontWeight: typography.mediumWeight,
      lineHeight: 14,
      textTransform: "uppercase",
    },
    movementSummaryStatValue: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
      lineHeight: 18,
    },
    accountBalanceGrid: {
      gap: spacing.sm,
    },
    distributionCard: {
      height: BALANCE_CHART_CONTENT_HEIGHT + spacing.md * 2,
      gap: spacing.md,
      justifyContent: "center",
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    distributionChartFrame: {
      width: "100%",
      height: BALANCE_CHART_CONTENT_HEIGHT,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    distributionTreemapTile: {
      position: "absolute",
      justifyContent: "flex-end",
      gap: 2,
      padding: spacing.sm,
      borderRadius: radii.input,
      overflow: "hidden",
    },
    distributionTreemapTitle: {
      fontSize: 12,
      fontWeight: typography.mediumWeight,
      lineHeight: 16,
    },
    distributionTreemapPercent: {
      fontSize: 11,
      fontWeight: typography.mediumWeight,
      lineHeight: 14,
    },
    distributionEmpty: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
      paddingHorizontal: spacing.md,
      textAlign: "center",
    },
    trendChart: {
      height: BALANCE_CHART_CONTENT_HEIGHT,
      justifyContent: "space-between",
    },
    trendPlot: {
      width: "100%",
      height: BALANCE_TREND_PLOT_HEIGHT,
      overflow: "hidden",
      position: "relative",
    },
    trendGridLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    trendGridLineTop: {
      top: 6,
    },
    trendGridLineMiddle: {
      top: 48,
    },
    trendGridLineBottom: {
      bottom: 6,
    },
    trendYAxisOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: spacing.xl,
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 1,
      zIndex: 2,
    },
    trendAxisLabel: {
      color: colors.mutedText,
      fontSize: 9,
      fontWeight: typography.mediumWeight,
      lineHeight: 11,
    },
    trendLineSegment: {
      position: "absolute",
      height: 3,
      borderRadius: 2,
    },
    trendPoint: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    trendXAxis: {
      alignItems: "center",
    },
    trendXAxisLabels: {
      width: "100%",
      height: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    trendLabel: {
      color: colors.mutedText,
      fontSize: 10,
      fontWeight: typography.mediumWeight,
      lineHeight: 10,
    },
    filterSection: {
      alignItems: "stretch",
      gap: 2,
      position: "relative",
      zIndex: 6,
    },
    filterToggle: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    filterToggleMain: {
      minHeight: 30,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
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
    clearFilterButton: {
      width: 30,
      height: 30,
      margin: 0,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    filterContextText: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      paddingHorizontal: spacing.xs,
    },
    filterContextSpacer: {
      height: spacing.sm,
    },
    filterGrid: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
    },
    movementFilterGroups: {
      position: "absolute",
      top: 38,
      left: 0,
      right: 0,
      width: "100%",
      zIndex: 7,
    },
    movementFilterPanel: {
      width: "100%",
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      paddingBottom: spacing.md,
    },
    movementFilterGroup: {
      gap: spacing.sm,
    },
    movementFilterGroupLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      paddingHorizontal: spacing.xs,
      textTransform: "uppercase",
    },
    filterControl: {
      flexShrink: 0,
    },
    filterDateControl: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    filterDateButton: {
      width: 42,
      height: 42,
      margin: 0,
      borderRadius: 0,
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
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    groupedMenuItem: {
      minWidth: 220,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      paddingRight: spacing.lg,
    },
    groupedSubcategoryMenuItem: {
      paddingLeft: spacing.lg,
    },
    groupedMenuItemPressed: {
      backgroundColor: colors.selected,
    },
    groupedMenuIconSlot: {
      width: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    groupedMenuText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.bodySize,
      lineHeight: 22,
    },
    groupedMenuCategoryText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
    },
    selectButton: {
      borderRadius: radii.button,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    selectButtonContent: {
      minHeight: 44,
      flexDirection: "row-reverse",
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
    recurrenceSection: {
      gap: spacing.sm,
    },
    recurrenceToggle: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingRight: spacing.sm,
      borderRadius: radii.input,
    },
    recurrenceToggleTitle: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
    },
    recurrenceDisclosure: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    recurrenceIntervalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    recurrenceIntervalInput: {
      width: 84,
      height: 48,
      backgroundColor: colors.background,
    },
    recurrenceIntervalLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    bottomAction: {
      position: "relative",
      alignItems: "center",
      alignSelf: "stretch",
      zIndex: 2,
    },
    bottomActionContent: {
      overflow: "visible",
    },
    addButton: {
      width: "70%",
    },
    fabMenuWrap: {
      position: "absolute",
      bottom: 80,
      width: "70%",
      alignSelf: "center",
      alignItems: "stretch",
      zIndex: 3,
    },
    fabMenu: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    fabOption: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
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
    scopeDialog: {
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    scopeDialogTitle: {
      color: colors.text,
      fontWeight: typography.bodyWeight,
    },
    scopeDialogText: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 24,
    },
    scopeDialogHint: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.bodyWeight,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    infoDialogContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    monthGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.button,
    },
    monthGroupHeaderFirst: {
      paddingTop: 0,
    },
    monthGroupHeaderPressed: {
      backgroundColor: colors.selected,
    },
    monthGroupTitleWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    monthGroupTitle: {
      flex: 1,
      minWidth: 0,
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    loadMoreRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.input,
      backgroundColor: colors.surface,
    },
    loadMoreRowPressed: {
      backgroundColor: colors.selected,
    },
    loadMoreText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
    },
    movementRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    movementContent: {
      flex: 1,
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
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
    movementDateLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minWidth: 0,
    },
    movementDateLabel: {
      flexShrink: 1,
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.bodyWeight,
      lineHeight: 20,
    },
    movementMetaLine: {
      flexDirection: "row",
      alignItems: "center",
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
    movementTransferAccountText: {
      flexShrink: 1,
      maxWidth: "46%",
    },
    amount: {
      minWidth: 84,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      textAlign: "right",
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
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
  });
}
