import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  HelperText,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppHeaderActionButton } from "@/components/layout/AppHeaderActionButton";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppActionMenu } from "@/components/ui/AppActionMenu";
import { AppAnimatedDisclosure } from "@/components/ui/AppAnimatedDisclosure";
import { AppBottomActionDrawer } from "@/components/ui/AppBottomActionDrawer";
import { AppCatFab } from "@/components/ui/AppCatFab";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import {
  AppColorPicker,
  AppDescriptionInput,
  AppIconPickerGrid,
  AppInfoLine,
} from "@/components/ui/AppFormFields";
import {
  AppConfirmDialog,
  AppContentDialog,
  AppFormDialog,
} from "@/components/ui/AppFormDialog";
import { AppLoadingState } from "@/components/ui/AppLoadingState";
import { AppMeowneySnackbar } from "@/components/ui/AppMeowneySnackbar";
import { AppSelectMenu } from "@/components/ui/AppSelectMenu";
import {
  SUBSCRIPTION_ICON_OPTIONS,
  getSubscriptionColorOptions,
  type SubscriptionIconName,
} from "@/constants/subscriptions";
import { categoryRepository } from "@/database/repositories/category.repository";
import { notebookRepository } from "@/database/repositories/notebook.repository";
import {
  subscriptionRepository,
  type SubscriptionInput,
} from "@/database/repositories/subscription.repository";
import { useDeferredQuery } from "@/hooks/useDeferredQuery";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { useAppStore } from "@/stores/app.store";
import { getMeowneyColors, type MeowneyColors } from "@/theme/colors";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import {
  getCategoryAndChildIds,
  getCategoryDisplayName,
  getCategoryDisplayNameById,
  getPrimaryCategories,
  getSelectedParentCategory,
  getSelectedSubcategory,
  getSubcategories,
} from "@/utils/categoryHierarchy";
import { formatAppDateTime } from "@/utils/dateFormat";
import { formatMoneyFromCents, parseMoneyToCents } from "@/utils/moneyFormat";
import type { Category } from "@/features/categories/types";
import type { SubscriptionFrequency, SubscriptionListItem } from "./types";

type FrequencyFilter = "all" | SubscriptionFrequency;
type CategoryFilter = "all" | string;

type SubscriptionFormValues = {
  amount: string;
  categoryId: string;
  color: string;
  icon: SubscriptionIconName;
  name: string;
  notes: string;
  paymentFrequency: SubscriptionFrequency;
};

type SubscriptionData = {
  categories: Category[];
  currency: string;
  subscriptions: SubscriptionListItem[];
};

const frequencyOptions: { label: string; value: SubscriptionFrequency }[] = [
  { label: "Semanal", value: "weekly" },
  { label: "Mensual", value: "monthly" },
  { label: "Bimestral", value: "bimonthly" },
  { label: "Trimestral", value: "quarterly" },
  { label: "Semestral", value: "semiannual" },
  { label: "Anual", value: "annual" },
];

const filterOptions: { label: string; value: FrequencyFilter }[] = [
  { label: "Todas", value: "all" },
  ...frequencyOptions,
];

function getInitialForm(
  colors: MeowneyColors,
  categories: Category[],
): SubscriptionFormValues {
  return {
    amount: "",
    categoryId: categories[0]?.id ?? "",
    color: colors.irisGleam,
    icon: "play-box-outline",
    name: "",
    notes: "",
    paymentFrequency: "monthly",
  };
}

function getFormFromSubscription(
  subscription: SubscriptionListItem,
  colors: MeowneyColors,
  categories: Category[],
): SubscriptionFormValues {
  const fallback = getInitialForm(colors, categories);

  return {
    amount: String(subscription.amount / 100),
    categoryId: subscription.categoryId,
    color: subscription.color ?? fallback.color,
    icon: (subscription.icon as SubscriptionIconName | null) ?? fallback.icon,
    name: subscription.name,
    notes: subscription.notes ?? "",
    paymentFrequency: subscription.paymentFrequency,
  };
}

function toInput(values: SubscriptionFormValues): SubscriptionInput | null {
  const amount = parseMoneyToCents(values.amount);

  if (!values.name.trim() || !values.categoryId || !amount) {
    return null;
  }

  return {
    amount,
    categoryId: values.categoryId,
    color: values.color,
    icon: values.icon,
    name: values.name.trim(),
    notes: values.notes.trim() || null,
    paymentFrequency: values.paymentFrequency,
  };
}

function getSelectedCategory(categories: Category[], categoryId: string) {
  return categories.find((category) => category.id === categoryId) ?? null;
}

function formatFrequency(frequency: SubscriptionFrequency) {
  return (
    frequencyOptions.find((option) => option.value === frequency)?.label ??
    "Mensual"
  );
}

function getMonthlyEquivalent(subscription: SubscriptionListItem) {
  if (subscription.paymentFrequency === "weekly") {
    return (subscription.amount * 52) / 12;
  }

  if (subscription.paymentFrequency === "quarterly") {
    return subscription.amount / 3;
  }

  if (subscription.paymentFrequency === "bimonthly") {
    return subscription.amount / 2;
  }

  if (subscription.paymentFrequency === "semiannual") {
    return subscription.amount / 6;
  }

  if (subscription.paymentFrequency === "annual") {
    return subscription.amount / 12;
  }

  return subscription.amount;
}

export function SubscriptionsScreen() {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore(
    (state) => state.selectedNotebookName,
  );
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(
    () => getSubscriptionColorOptions(colors),
    [colors],
  );
  const stableCurrency = useMemo(
    () =>
      selectedNotebookId
        ? (notebookRepository.getActiveById(selectedNotebookId)?.currency ??
          "MXN")
        : "MXN",
    [selectedNotebookId],
  );
  const stableNotebookName = useMemo(
    () =>
      selectedNotebookName ??
      (selectedNotebookId
        ? (notebookRepository.getActiveById(selectedNotebookId)?.name ?? null)
        : null),
    [selectedNotebookId, selectedNotebookName],
  );
  const loadSubscriptionData = useCallback((): SubscriptionData => {
    if (!selectedNotebookId) {
      return { categories: [], currency: stableCurrency, subscriptions: [] };
    }

    categoryRepository.seedDefaultCategories(selectedNotebookId);

    return {
      categories: categoryRepository
        .listActiveByNotebook(selectedNotebookId)
        .filter((category) => category.type === "expense"),
      currency:
        notebookRepository.getActiveById(selectedNotebookId)?.currency ??
        stableCurrency,
      subscriptions:
        subscriptionRepository.listActiveByNotebook(selectedNotebookId),
    };
  }, [selectedNotebookId, stableCurrency]);
  const {
    data,
    error: loadError,
    isLoading,
    reload,
  } = useDeferredQuery(loadSubscriptionData, {
    categories: [],
    currency: stableCurrency,
    subscriptions: [],
  });
  const [frequencyFilter, setFrequencyFilter] =
    useState<FrequencyFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<
    string[]
  >([]);
  const [infoSubscription, setInfoSubscription] =
    useState<SubscriptionListItem | null>(null);
  const [deleteSubscription, setDeleteSubscription] =
    useState<SubscriptionListItem | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<SubscriptionListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors, []));
  const [showNameError, setShowNameError] = useState(false);
  const [showAmountError, setShowAmountError] = useState(false);
  const [showCategoryError, setShowCategoryError] = useState(false);
  const [actionMenuSubscriptionId, setActionMenuSubscriptionId] = useState<
    string | null
  >(null);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubscriptionIds((current) => {
      const activeIds = new Set(
        data.subscriptions.map((subscription) => subscription.id),
      );
      const next = current.filter((id) => activeIds.has(id));
      const missing = data.subscriptions
        .map((subscription) => subscription.id)
        .filter((id) => !next.includes(id));

      return [...next, ...missing];
    });
  }, [data.subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const categoryFilterIds =
      categoryFilter === "all"
        ? null
        : getCategoryAndChildIds(data.categories, categoryFilter);

    return data.subscriptions.filter(
      (subscription) =>
        (frequencyFilter === "all" ||
          subscription.paymentFrequency === frequencyFilter) &&
        (!categoryFilterIds || categoryFilterIds.has(subscription.categoryId)),
    );
  }, [categoryFilter, data.categories, data.subscriptions, frequencyFilter]);
  const selectedSubscriptions = useMemo(
    () =>
      data.subscriptions.filter((subscription) =>
        selectedSubscriptionIds.includes(subscription.id),
      ),
    [data.subscriptions, selectedSubscriptionIds],
  );
  const selectedTotal = selectedSubscriptions.reduce(
    (sum, subscription) => sum + subscription.amount,
    0,
  );
  const monthlyAverage = data.subscriptions.reduce(
    (sum, subscription) => sum + getMonthlyEquivalent(subscription),
    0,
  );
  const filterLabel =
    filterOptions.find((option) => option.value === frequencyFilter)?.label ??
    "Todas";
  const categoryFilterLabel =
    categoryFilter === "all"
      ? "Todas"
      : (getCategoryDisplayNameById(data.categories, categoryFilter) || "Todas");

  const openCreate = () => {
    setFormValues(getInitialForm(colors, data.categories));
    setEditingSubscription(null);
    setShowNameError(false);
    setShowAmountError(false);
    setShowCategoryError(false);
    setIsFormOpen(true);
  };

  const openEdit = (subscription: SubscriptionListItem) => {
    setFormValues(getFormFromSubscription(subscription, colors, data.categories));
    setEditingSubscription(subscription);
    setShowNameError(false);
    setShowAmountError(false);
    setShowCategoryError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSubscription(null);
    setActionMenuSubscriptionId(null);
    setShowNameError(false);
    setShowAmountError(false);
    setShowCategoryError(false);
  };

  const saveForm = () => {
    const input = toInput(formValues);
    setShowNameError(!formValues.name.trim());
    setShowAmountError(!parseMoneyToCents(formValues.amount));
    setShowCategoryError(!formValues.categoryId);

    if (!input || !selectedNotebookId) {
      return;
    }

    if (editingSubscription) {
      subscriptionRepository.update(editingSubscription.id, input);
      setSnackbarMessage("Suscripción actualizada.");
    } else {
      subscriptionRepository.create(selectedNotebookId, input);
      setSnackbarMessage("Suscripción agregada.");
    }

    closeForm();
    reload();
  };

  const confirmDelete = () => {
    if (!deleteSubscription) {
      return;
    }

    subscriptionRepository.archive(deleteSubscription.id);
    setDeleteSubscription(null);
    setSnackbarMessage("Suscripción archivada.");
    reload();
  };

  const categoryFilterOptions = useMemo(
    () => [
      { label: "Todas", value: "all" },
      ...data.categories.map((category) => ({
        label: getCategoryDisplayName(data.categories, category),
        value: category.id,
      })),
    ],
    [data.categories],
  );
  const toggleFilters = useCallback(() => {
    setShowFilters((current) => !current);
  }, []);
  const clearFilters = useCallback(() => {
    setFrequencyFilter("all");
    setCategoryFilter("all");
  }, []);
  const toggleSubscription = useCallback((id: string) => {
    setSelectedSubscriptionIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }, []);

  const selectVisibleSubscriptions = useCallback(() => {
    setSelectedSubscriptionIds((current) => [
      ...current.filter(
        (id) =>
          !filteredSubscriptions.some((subscription) => subscription.id === id),
      ),
      ...filteredSubscriptions.map((subscription) => subscription.id),
    ]);
  }, [filteredSubscriptions]);

  const deselectVisibleSubscriptions = useCallback(() => {
    const visibleIds = new Set(
      filteredSubscriptions.map((subscription) => subscription.id),
    );

    setSelectedSubscriptionIds((current) =>
      current.filter((id) => !visibleIds.has(id)),
    );
  }, [filteredSubscriptions]);

  const keyExtractor = useCallback((item: SubscriptionListItem) => item.id, []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);
  const renderEmptyComponent = useCallback(
    () =>
      isLoading ? (
        <AppLoadingState
          colors={colors}
          label="Cargando suscripciones"
        />
      ) : (
        <AppEmptyState
          icon="calendar-sync-outline"
          title={
            loadError
              ? "No se pudieron cargar las suscripciones"
              : "Aún no hay suscripciones"
          }
          message={
            loadError
              ? "Intenta entrar de nuevo o revisa que la base de datos este disponible."
              : "Aquí aparecerán pagos que se repiten, como streaming, renta o servicios. Agrega una suscripción para saber cuánto se junta cada mes y desde qué cuenta sale."
          }
          style={styles.emptyState}
        />
      ),
    [colors, isLoading, loadError, styles.emptyState],
  );

  const renderSubscription = useCallback(({ item }: { item: SubscriptionListItem }) => {
    const checked = selectedSubscriptionIds.includes(item.id);
    const iconName =
      (item.icon as SubscriptionIconName | null) ?? "play-box-outline";
    const color = item.color ?? colors.irisGleam;

    return (
      <Surface style={styles.subscriptionRow} elevation={0}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`Incluir ${item.name} en el pago`}
          onPress={() => toggleSubscription(item.id)}
          style={({ pressed }) => [
            styles.subscriptionContent,
            pressed && styles.subscriptionPressed,
          ]}
        >
          <View
            style={[styles.subscriptionIconWrap, { backgroundColor: color }]}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={20}
              color={colors.void}
            />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.subscriptionName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.subscriptionMeta}>
              {formatFrequency(item.paymentFrequency)}
            </Text>
            <Text numberOfLines={1} style={styles.subscriptionCategory}>
              {item.categoryName}
            </Text>
          </View>
          <View style={styles.amountCopy}>
            <Text numberOfLines={1} style={styles.subscriptionAmount}>
              {formatMoneyFromCents(item.amount, data.currency)}
            </Text>
            <Text
              style={[
                styles.selectionState,
                checked ? styles.selectionStateChecked : null,
              ]}
            >
              {checked ? "Incluida" : "Sin incluir"}
            </Text>
          </View>
        </Pressable>

        <AppActionMenu
          visible={actionMenuSubscriptionId === item.id}
          onDismiss={() => setActionMenuSubscriptionId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la suscripción"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.subscriptionActionsButton}
              onPress={() => setActionMenuSubscriptionId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="information-outline"
            title="Ver"
            onPress={() => {
              setActionMenuSubscriptionId(null);
              setInfoSubscription(item);
            }}
          />
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Editar"
            onPress={() => {
              setActionMenuSubscriptionId(null);
              openEdit(item);
            }}
          />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuSubscriptionId(null);
              setDeleteSubscription(item);
            }}
          />
        </AppActionMenu>
      </Surface>
    );
  }, [
    actionMenuSubscriptionId,
    colors.irisGleam,
    colors.mutedText,
    colors.void,
    data.currency,
    selectedSubscriptionIds,
    styles,
    toggleSubscription,
  ]);

  const subscriptionFilters = (
    <View style={styles.filterSection}>
      <View style={styles.filterToggle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          onPress={toggleFilters}
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
          onPress={clearFilters}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          onPress={toggleFilters}
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
        maxHeight={230}
        style={styles.filterGroups}
        overlayContentStyle={styles.filterPanel}
      >
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Periodo</Text>
          <View style={styles.filterGrid}>
            <View style={styles.filterControl}>
              <AppSelectMenu
                anchor="icon"
                icon="calendar-range-outline"
                label="Periodo"
                options={filterOptions}
                selectedLabel={filterLabel}
                selectedValue={frequencyFilter}
                iconButtonStyle={styles.filterIconButton}
                menuContentStyle={styles.menuContent}
                onSelect={setFrequencyFilter}
              />
            </View>
          </View>
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Categoria</Text>
          <View style={styles.filterGrid}>
            <View style={styles.filterControl}>
              <AppSelectMenu
                anchor="icon"
                icon="shape-outline"
                label="Categoria"
                options={categoryFilterOptions}
                selectedLabel={categoryFilterLabel}
                selectedValue={categoryFilter}
                iconButtonStyle={styles.filterIconButton}
                menuContentStyle={styles.menuContent}
                onSelect={setCategoryFilter}
              />
            </View>
          </View>
        </View>
        <View style={styles.filterContextSpacer} />
        <Text numberOfLines={1} style={styles.filterContextText}>
          Periodo: {filterLabel} - Categoria: {categoryFilterLabel}
        </Text>
      </AppAnimatedDisclosure>
    </View>
  );

  const subscriptionsOverview = useMemo(() => (
    <View style={styles.summaryHeader}>
      <View style={styles.summarySection}>
        <View style={styles.summaryTitleRow}>
          <Text style={styles.summaryTitle}>Resumen mensual</Text>
          <Text style={styles.summaryCount}>
            {data.subscriptions.length} registradas
          </Text>
        </View>

        <Surface style={styles.summaryTable} elevation={0}>
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <MaterialCommunityIcons
                name="cash-check"
                size={18}
                color={colors.text}
              />
            </View>
            <View style={styles.metricCopy}>
              <Text numberOfLines={1} style={styles.metricLabel}>
                Seleccionados
              </Text>
              <Text style={styles.metricHint}>
                {selectedSubscriptions.length} pagos incluidos
              </Text>
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {formatMoneyFromCents(selectedTotal, data.currency)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={18}
                color={colors.text}
              />
            </View>
            <View style={styles.metricCopy}>
              <Text numberOfLines={1} style={styles.metricLabel}>
                Costo mensual
              </Text>
              <Text style={styles.metricHint}>Equivalente mensual</Text>
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.metricValue}
            >
              {formatMoneyFromCents(monthlyAverage, data.currency)}
            </Text>
          </View>
        </Surface>
      </View>
    </View>
  ), [
    colors.text,
    data.currency,
    data.subscriptions.length,
    monthlyAverage,
    selectedSubscriptions.length,
    selectedTotal,
    styles.metricCopy,
    styles.metricDivider,
    styles.metricHint,
    styles.metricIcon,
    styles.metricLabel,
    styles.metricRow,
    styles.metricValue,
    styles.summaryCount,
    styles.summaryHeader,
    styles.summarySection,
    styles.summaryTable,
    styles.summaryTitle,
    styles.summaryTitleRow,
  ]);

  const subscriptionListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      {subscriptionsOverview}
      <View style={styles.listSectionHeader}>
        <Text style={styles.listSectionTitle}>Suscripciones</Text>
        <View style={styles.listSectionControls}>
          <IconButton
            accessibilityLabel="Seleccionar suscripciones visibles"
            disabled={filteredSubscriptions.length === 0}
            icon="checkbox-multiple-marked-outline"
            iconColor={
              filteredSubscriptions.length === 0
                ? colors.disabled
                : colors.mutedText
            }
            size={18}
            style={styles.listSectionButton}
            onPress={selectVisibleSubscriptions}
          />
          <IconButton
            accessibilityLabel="Deseleccionar suscripciones visibles"
            disabled={filteredSubscriptions.length === 0}
            icon="checkbox-multiple-blank-outline"
            iconColor={
              filteredSubscriptions.length === 0
                ? colors.disabled
                : colors.mutedText
            }
            size={18}
            style={styles.listSectionButton}
            onPress={deselectVisibleSubscriptions}
          />
        </View>
      </View>
    </View>
  ), [
    colors.disabled,
    colors.mutedText,
    deselectVisibleSubscriptions,
    filteredSubscriptions.length,
    selectVisibleSubscriptions,
    styles.listHeader,
    styles.listSectionButton,
    styles.listSectionControls,
    styles.listSectionHeader,
    styles.listSectionTitle,
    subscriptionsOverview,
  ]);

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={stableNotebookName ?? "Meowney"}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a Mi libreta"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen
        eyebrow="SUSCRIPCIONES"
        helpTitle="¿Para qué sirven las suscripciones?"
        helpMessage="Las suscripciones son pagos que regresan cada cierto tiempo. Meowney las deja en vigilancia para que recuerdes que vienen, cuánto cuestan y desde qué cuenta salen."
      >
        {!selectedNotebookId ? (
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para registrar suscripciones."
            style={styles.missingNotebook}
          />
        ) : (
          <>
            {subscriptionFilters}
            <FlatList
              style={styles.list}
              data={isLoading ? [] : filteredSubscriptions}
              keyExtractor={keyExtractor}
              renderItem={renderSubscription}
              ListHeaderComponent={subscriptionListHeader}
              contentContainerStyle={
                !isLoading && filteredSubscriptions.length
                  ? styles.listContent
                  : styles.emptyContent
              }
              ItemSeparatorComponent={renderSeparator}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
            />
            <AppBottomActionDrawer style={styles.bottomAction}>
              <AppCatFab
                accessibilityLabel="Agregar suscripción"
                disabled={data.categories.length === 0}
                label="Agregar suscripción"
                style={styles.addButton}
                onPress={openCreate}
              />
            </AppBottomActionDrawer>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoSubscription)}
          title="Información"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoSubscription(null)}
          onDismiss={() => setInfoSubscription(null)}
        >
          {infoSubscription ? (
            <>
              <AppInfoLine label="Nombre" value={infoSubscription.name} />
              <AppInfoLine
                label="Categoria"
                value={infoSubscription.categoryName}
              />
              <AppInfoLine
                label="Monto"
                value={formatMoneyFromCents(infoSubscription.amount, data.currency)}
              />
              <AppInfoLine
                label="Frecuencia"
                value={formatFrequency(infoSubscription.paymentFrequency)}
              />
              <AppInfoLine
                label="Promedio mensual"
                value={formatMoneyFromCents(
                  getMonthlyEquivalent(infoSubscription),
                  data.currency,
                )}
              />
              <AppInfoLine
                label="Notas"
                value={infoSubscription.notes || "Sin notas"}
              />
              <AppInfoLine
                label="Creación"
                value={formatAppDateTime(infoSubscription.createdAt)}
              />
              <AppInfoLine
                label="Actualización"
                value={formatAppDateTime(infoSubscription.updatedAt)}
              />
            </>
          ) : null}
        </AppContentDialog>

        <SubscriptionFormDialog
          categories={data.categories}
          colorOptions={colorOptions}
          showAmountError={showAmountError}
          showCategoryError={showCategoryError}
          showNameError={showNameError}
          styles={styles}
          title={
            editingSubscription ? "Editar suscripción" : "Agregar suscripción"
          }
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteSubscription)}
          title="Eliminar suscripción"
          message="Esta acción archivará la suscripción y dejará de mostrarse."
          confirmLabel="Confirmar"
          onCancel={() => setDeleteSubscription(null)}
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

type SubscriptionFormDialogProps = {
  categories: Category[];
  colorOptions: string[];
  showAmountError: boolean;
  showCategoryError: boolean;
  showNameError: boolean;
  styles: ReturnType<typeof createStyles>;
  title: string;
  values: SubscriptionFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: SubscriptionFormValues) => void;
  onSave: () => void;
};

function SubscriptionFormDialog({
  categories,
  colorOptions,
  showAmountError,
  showCategoryError,
  showNameError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: SubscriptionFormDialogProps) {
  const selectedCategory = getSelectedCategory(categories, values.categoryId);
  const selectedParentCategory = getSelectedParentCategory(categories, values.categoryId);
  const selectedSubcategory = getSelectedSubcategory(categories, values.categoryId);
  const parentOptions = getPrimaryCategories(categories, "expense");
  const subcategoryOptions = getSubcategories(categories, selectedParentCategory?.id);

  return (
    <AppFormDialog
      visible={visible}
      title={title}
      contentContainerStyle={styles.form}
      onCancel={onCancel}
      onSave={onSave}
    >
      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>NOMBRE</Text>
        <TextInput
          mode="outlined"
          placeholder="Ej. Netflix, Renta o Gimnasio"
          value={values.name}
          onChangeText={(name) => onChange({ ...values, name })}
          error={showNameError}
        />
        {showNameError ? (
          <HelperText type="error" visible>
            Escribe el nombre del pago recurrente.
          </HelperText>
        ) : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>CATEGORIA</Text>
        <AppSelectMenu
          icon="chevron-down"
          label="Categoria"
          options={parentOptions.map((category) => ({
            label: getCategoryDisplayName(categories, category),
            value: category.id,
          }))}
          selectedLabel={selectedParentCategory?.name ?? "Seleccionar"}
          selectedValue={selectedParentCategory?.id ?? ""}
          buttonStyle={styles.select}
          buttonContentStyle={styles.selectContent}
          menuContentStyle={styles.menuContent}
          onSelect={(categoryId) => onChange({ ...values, categoryId })}
        />
        {showCategoryError ? (
          <HelperText type="error" visible>
            Elige la categoría de la suscripción.
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
              { label: "Sin subcategoría", value: selectedParentCategory?.id ?? "" },
              ...subcategoryOptions.map((category) => ({
                label: category.name,
                value: category.id,
              })),
            ]}
            selectedLabel={selectedSubcategory?.name ?? "Sin subcategoría"}
            selectedValue={selectedCategory?.id ?? ""}
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
          placeholder="Ej. 199"
          keyboardType="decimal-pad"
          value={values.amount}
          onChangeText={(amount) => onChange({ ...values, amount })}
          error={showAmountError}
        />
        {showAmountError ? (
          <HelperText type="error" visible>
            Escribe cuánto cuesta, mayor a cero.
          </HelperText>
        ) : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>FRECUENCIA</Text>
        <AppSelectMenu
          icon="chevron-down"
          label="Frecuencia"
          options={frequencyOptions}
          selectedLabel={formatFrequency(values.paymentFrequency)}
          selectedValue={values.paymentFrequency}
          buttonStyle={styles.select}
          buttonContentStyle={styles.selectContent}
          menuContentStyle={styles.menuContent}
          onSelect={(paymentFrequency) =>
            onChange({ ...values, paymentFrequency })
          }
        />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>NOTAS</Text>
        <AppDescriptionInput
          placeholder="Ej. Plan familiar o fecha de cobro"
          value={values.notes}
          onChangeText={(notes) => onChange({ ...values, notes })}
        />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>ICONO</Text>
        <AppIconPickerGrid
          columns={5}
          icons={SUBSCRIPTION_ICON_OPTIONS}
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
    summaryHeader: {
      paddingBottom: spacing.md,
    },
    listHeader: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    listSectionHeader: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    listSectionTitle: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    listSectionControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    listSectionButton: {
      width: 34,
      height: 34,
      margin: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    summarySection: {
      gap: spacing.sm,
    },
    summaryTitleRow: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xs,
    },
    summaryTable: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    summaryTitle: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
      lineHeight: 18,
    },
    summaryCount: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    metricRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    metricIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.navItem,
      backgroundColor: colors.selected,
    },
    metricCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    metricLabel: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    metricHint: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 18,
    },
    metricValue: {
      maxWidth: 132,
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
      textAlign: "right",
    },
    metricDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    filterSection: {
      alignItems: "stretch",
      marginHorizontal: -spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      position: "relative",
      zIndex: 6,
    },
    filterToggle: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    filterToggleMain: {
      minHeight: 28,
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
      width: 28,
      height: 28,
      margin: 0,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    chevronButton: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
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
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
    },
    filterGroups: {
      position: "absolute",
      top: 34,
      left: 0,
      right: 0,
      width: "100%",
      zIndex: 7,
    },
    filterPanel: {
      width: "100%",
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
      textTransform: "uppercase",
    },
    filterControl: {
      flexShrink: 0,
    },
    filterIconButton: {
      width: 40,
      height: 40,
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
    subscriptionRow: {
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    subscriptionContent: {
      minHeight: 92,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.sm,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    subscriptionPressed: {
      backgroundColor: colors.selected,
    },
    subscriptionIconWrap: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.input,
    },
    nameCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    subscriptionName: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    subscriptionMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 18,
    },
    subscriptionCategory: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      textTransform: "uppercase",
    },
    amountCopy: {
      minWidth: 104,
      maxWidth: 132,
      flexShrink: 0,
      alignItems: "flex-end",
      gap: 3,
    },
    subscriptionAmount: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
      textAlign: "right",
    },
    selectionState: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      textTransform: "uppercase",
    },
    selectionStateChecked: {
      color: colors.success,
    },
    subscriptionActionsButton: {
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
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    missingNotebook: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    bottomAction: {
      alignItems: "center",
      alignSelf: "stretch",
      marginHorizontal: -spacing.lg,
      marginTop: -spacing.lg,
    },
    addButton: {
      width: "70%",
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
      flexDirection: "row-reverse",
    },
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
  });
}
