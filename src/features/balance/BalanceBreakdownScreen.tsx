import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Button, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppHeaderActionButton } from "@/components/layout/AppHeaderActionButton";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { AppLoadingState } from "@/components/ui/AppLoadingState";
import { accountRepository } from "@/database/repositories/account.repository";
import { historyRepository } from "@/database/repositories/history.repository";
import { notebookRepository } from "@/database/repositories/notebook.repository";
import { useDeferredQuery } from "@/hooks/useDeferredQuery";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { useAppStore } from "@/stores/app.store";
import { getMeowneyColors, type MeowneyColors } from "@/theme/colors";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { toDateKey } from "@/components/ui/AppDatePicker";
import { formatAppDate, isDateKey } from "@/utils/dateFormat";
import { formatMoneyFromCents } from "@/utils/moneyFormat";
import type { Account } from "@/features/accounts/types";
import type { DailyAccountBalance } from "@/features/balance/types";

type SortDirection = "asc" | "desc";

const DAY_COLUMN_WIDTH = 108;
const TOTAL_COLUMN_WIDTH = 124;
const ACCOUNT_COLUMN_MIN_WIDTH = 124;
const TABLE_HEADER_HEIGHT = 48;
const TABLE_ROW_HEIGHT = 48;

type BreakdownData = {
  accounts: Account[];
  currency: string;
  notebookName: string | null;
  rows: DailyAccountBalance[];
};

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatAmount(amount: number, currency: string) {
  return formatMoneyFromCents(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BalanceBreakdownScreen() {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const router = useRouter();
  const params = useLocalSearchParams<{
    accounts?: string;
    date?: string;
  }>();
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = useMemo(() => toDateKey(new Date()), []);
  const selectedDate = useMemo(() => {
    const dateParam = getParamValue(params.date);

    return dateParam && isDateKey(dateParam) ? dateParam : today;
  }, [params.date, today]);
  const selectedAccountIds = useMemo(() => {
    const accountParam = getParamValue(params.accounts);

    return accountParam ? accountParam.split(",").filter(Boolean) : [];
  }, [params.accounts]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [tableFrame, setTableFrame] = useState({ height: 0, width: 0 });
  const accountHeaderScrollRef = useRef<ScrollView | null>(null);

  const rangeStart = selectedDate <= today ? selectedDate : today;
  const rangeEnd = selectedDate <= today ? today : selectedDate;

  const loadBreakdownData = useCallback((): BreakdownData => {
    if (!selectedNotebookId) {
      return { accounts: [], currency: "MXN", notebookName: null, rows: [] };
    }

    const accounts = accountRepository.listActiveByNotebook(selectedNotebookId);
    const notebook = notebookRepository.getActiveById(selectedNotebookId);

    return {
      accounts,
      currency: notebook?.currency ?? "MXN",
      notebookName: notebook?.name ?? null,
      rows: historyRepository.listDailyBalancesByNotebookBetweenDates(
        selectedNotebookId,
        rangeStart,
        rangeEnd,
      ),
    };
  }, [rangeEnd, rangeStart, selectedNotebookId]);

  const { data, isLoading, reload } = useDeferredQuery(loadBreakdownData, {
    accounts: [],
    currency: "MXN",
    notebookName: null,
    rows: [],
  });

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const visibleAccounts = useMemo(
    () =>
      selectedAccountIds.length === 0
        ? data.accounts
        : data.accounts.filter((account) =>
            selectedAccountIds.includes(account.id),
          ),
    [data.accounts, selectedAccountIds],
  );
  const orderedRows = useMemo(
    () =>
      [...data.rows].sort((left, right) =>
        sortDirection === "asc"
          ? left.dateKey.localeCompare(right.dateKey)
          : right.dateKey.localeCompare(left.dateKey),
      ),
    [data.rows, sortDirection],
  );
  const accountLabel =
    visibleAccounts.length === 1
      ? "1 cuenta"
      : `${visibleAccounts.length} cuentas`;
  const updateTableFrame = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;

    setTableFrame((current) =>
      current.height === height && current.width === width
        ? current
        : { height, width },
    );
  }, []);
  const hasTableFrame = tableFrame.height > 0 && tableFrame.width > 0;
  const accountColumnWidth =
    visibleAccounts.length > 0
      ? Math.max(
          ACCOUNT_COLUMN_MIN_WIDTH,
          (tableFrame.height - DAY_COLUMN_WIDTH - TOTAL_COLUMN_WIDTH) /
            visibleAccounts.length,
        )
      : ACCOUNT_COLUMN_MIN_WIDTH;
  const syncAccountHeaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      accountHeaderScrollRef.current?.scrollTo({
        animated: false,
        x: event.nativeEvent.contentOffset.x,
      });
    },
    [],
  );

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={data.notebookName ?? "Meowney"}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a Mi dinero"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={styles.contentSafeArea}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>DESGLOSE DIARIO</Text>
            <Text style={styles.subtitle}>
              {formatAppDate(rangeStart)} - {formatAppDate(rangeEnd)} ·{" "}
              {accountLabel}
            </Text>
          </View>

          <View style={styles.toolbar}>
            <Button
              mode="outlined"
              icon={
                sortDirection === "asc"
                  ? "sort-calendar-ascending"
                  : "sort-calendar-descending"
              }
              style={styles.sortButton}
              labelStyle={styles.sortButtonLabel}
              onPress={() =>
                setSortDirection((current) =>
                  current === "asc" ? "desc" : "asc",
                )
              }
            >
              {sortDirection === "asc" ? "Dia ascendente" : "Dia descendente"}
            </Button>
          </View>

          {isLoading ? (
            <View style={styles.centerPanel}>
              <AppLoadingState colors={colors} label="Cargando desglose" />
            </View>
          ) : visibleAccounts.length === 0 ? (
            <AppEmptyState
              icon="wallet-outline"
              title="No hay cuentas para desglosar"
              message="Ajusta el filtro de Mi dinero o agrega una cuenta para ver los saldos por dia."
            />
          ) : (
            <View style={styles.tableFrame} onLayout={updateTableFrame}>
              {hasTableFrame ? (
                <Surface
                  style={[
                    styles.tableSurface,
                    {
                      height: tableFrame.width,
                      left: (tableFrame.width - tableFrame.height) / 2,
                      top: (tableFrame.height - tableFrame.width) / 2,
                      transform: [{ rotate: "90deg" }],
                      width: tableFrame.height,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={[styles.tableLayout, styles.tableHeader]}>
                    <View style={styles.fixedColumns}>
                      <View style={styles.dayColumn}>
                        <View
                          style={[
                            styles.dayCell,
                            styles.headerCell,
                            styles.tableHeaderRow,
                          ]}
                        >
                          <Text style={styles.dayHeaderText}>Dia</Text>
                        </View>
                      </View>
                      <View style={styles.totalColumn}>
                        <View
                          style={[
                            styles.totalCell,
                            styles.headerCell,
                            styles.tableHeaderRow,
                          ]}
                        >
                          <Text style={styles.dayHeaderText}>Total</Text>
                        </View>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      ref={accountHeaderScrollRef}
                      scrollEnabled={false}
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.tableHeaderCellsRow}>
                        {visibleAccounts.map((account) => (
                          <View
                            key={account.id}
                            style={[
                              styles.accountCell,
                              styles.headerCell,
                              styles.tableHeaderRow,
                              { width: accountColumnWidth },
                            ]}
                          >
                            <View style={styles.accountHeader}>
                              <View
                                style={[
                                  styles.accountDot,
                                  {
                                    backgroundColor:
                                      account.color ?? colors.selected,
                                  },
                                ]}
                              />
                              <Text
                                numberOfLines={1}
                                style={styles.accountHeaderText}
                              >
                                {account.name}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <ScrollView
                    style={styles.tableScrollBody}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.tableBody}
                  >
                    <View style={styles.tableLayout}>
                      <View style={styles.fixedColumns}>
                        <View style={styles.dayColumn}>
                          {orderedRows.map((row) => (
                            <View
                              key={row.dateKey}
                              style={[styles.dayCell, styles.bodyCell]}
                            >
                              <Text style={styles.dayText}>
                                {formatAppDate(row.dateKey)}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.totalColumn}>
                          {orderedRows.map((row) => {
                            const visibleTotal = row.balances.reduce(
                              (total, balance) =>
                                visibleAccounts.some(
                                  (account) => account.id === balance.accountId,
                                )
                                  ? total + balance.balance
                                  : total,
                              0,
                            );

                            return (
                              <View
                                key={row.dateKey}
                                style={[styles.totalCell, styles.bodyCell]}
                              >
                                <Text
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  style={[
                                    styles.amountText,
                                    visibleTotal < 0
                                      ? styles.negativeAmount
                                      : null,
                                  ]}
                                >
                                  {formatAmount(visibleTotal, data.currency)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      <ScrollView
                        horizontal
                        onScroll={syncAccountHeaderScroll}
                        scrollEventThrottle={16}
                        showsHorizontalScrollIndicator
                      >
                        <View>
                          {orderedRows.map((row) => {
                            const balancesByAccount = new Map(
                              row.balances.map((balance) => [
                                balance.accountId,
                                balance.balance,
                              ]),
                            );

                            return (
                              <View key={row.dateKey} style={styles.tableRow}>
                                {visibleAccounts.map((account) => (
                                  <View
                                    key={`${row.dateKey}_${account.id}`}
                                    style={[
                                      styles.accountCell,
                                      styles.bodyCell,
                                      { width: accountColumnWidth },
                                    ]}
                                  >
                                    <Text
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      style={[
                                        styles.amountText,
                                        (balancesByAccount.get(account.id) ??
                                          0) < 0
                                          ? styles.negativeAmount
                                          : null,
                                      ]}
                                    >
                                      {formatAmount(
                                        balancesByAccount.get(account.id) ?? 0,
                                        data.currency,
                                      )}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  </ScrollView>
                </Surface>
              ) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
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
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.background,
    },
    header: {
      minWidth: 0,
      gap: spacing.xs,
    },
    eyebrow: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    subtitle: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    toolbar: {
      alignItems: "flex-start",
    },
    sortButton: {
      borderRadius: radii.button,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    sortButtonLabel: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
    },
    centerPanel: {
      flex: 1,
      justifyContent: "center",
    },
    tableFrame: {
      flex: 1,
      overflow: "hidden",
      position: "relative",
    },
    tableSurface: {
      position: "absolute",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    tableBody: {
      paddingBottom: spacing.md,
    },
    tableScrollBody: {
      flex: 1,
    },
    tableLayout: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    tableHeader: {
      flexShrink: 0,
    },
    fixedColumns: {
      flexDirection: "row",
      flexShrink: 0,
    },
    dayColumn: {
      width: DAY_COLUMN_WIDTH,
      backgroundColor: colors.surface,
      zIndex: 1,
    },
    totalColumn: {
      width: TOTAL_COLUMN_WIDTH,
      backgroundColor: colors.surface,
      zIndex: 1,
    },
    tableRow: {
      flexDirection: "row",
      height: TABLE_ROW_HEIGHT,
    },
    tableHeaderCellsRow: {
      flexDirection: "row",
      height: TABLE_HEADER_HEIGHT,
    },
    tableHeaderRow: {
      height: TABLE_HEADER_HEIGHT,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    headerCell: {
      alignItems: "center",
      height: TABLE_HEADER_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    bodyCell: {
      height: TABLE_ROW_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    dayCell: {
      width: DAY_COLUMN_WIDTH,
    },
    totalCell: {
      width: TOTAL_COLUMN_WIDTH,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    accountCell: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
    },
    accountHeader: {
      maxWidth: "100%",
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
    },
    accountDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textAlign: "center",
      textTransform: "uppercase",
    },
    accountHeaderText: {
      flexShrink: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textAlign: "center",
      textTransform: "uppercase",
    },
    dayHeaderText: {
      color: colors.text,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textAlign: "center",
      textTransform: "uppercase",
    },
    dayText: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
    },
    amountText: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.bodyWeight,
      textAlign: "right",
    },
    negativeAmount: {
      color: colors.error,
    },
  });
}
