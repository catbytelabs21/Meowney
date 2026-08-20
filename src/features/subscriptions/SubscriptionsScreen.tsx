import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Menu, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppActionMenu } from '@/components/ui/AppActionMenu';
import { AppAnimatedDisclosure } from '@/components/ui/AppAnimatedDisclosure';
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppDraggableFab } from '@/components/ui/AppDraggableFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppDescriptionInput, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import {
  SUBSCRIPTION_ICON_OPTIONS,
  getSubscriptionColorOptions,
  type SubscriptionIconName,
} from '@/constants/subscriptions';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { subscriptionRepository, type SubscriptionInput } from '@/database/repositories/subscription.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDateTime } from '@/utils/dateFormat';
import type { Subscription, SubscriptionFrequency } from './types';

type FrequencyFilter = 'all' | SubscriptionFrequency;

type SubscriptionFormValues = {
  amount: string;
  color: string;
  icon: SubscriptionIconName;
  name: string;
  notes: string;
  paymentFrequency: SubscriptionFrequency;
};

type SubscriptionData = {
  currency: string;
  subscriptions: Subscription[];
};

const frequencyOptions: { label: string; value: SubscriptionFrequency }[] = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensual', value: 'monthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Semestral', value: 'semiannual' },
  { label: 'Anual', value: 'annual' },
];

const filterOptions: { label: string; value: FrequencyFilter }[] = [
  { label: 'Todas', value: 'all' },
  ...frequencyOptions,
];

function getInitialForm(colors: MeowneyColors): SubscriptionFormValues {
  return {
    amount: '',
    color: colors.irisGleam,
    icon: 'play-box-outline',
    name: '',
    notes: '',
    paymentFrequency: 'monthly',
  };
}

function getFormFromSubscription(subscription: Subscription, colors: MeowneyColors): SubscriptionFormValues {
  const fallback = getInitialForm(colors);

  return {
    amount: String(subscription.amount / 100),
    color: subscription.color ?? fallback.color,
    icon: (subscription.icon as SubscriptionIconName | null) ?? fallback.icon,
    name: subscription.name,
    notes: subscription.notes ?? '',
    paymentFrequency: subscription.paymentFrequency,
  };
}

function parseAmount(value: string) {
  const normalized = value.replace(',', '.').trim();
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
}

function toInput(values: SubscriptionFormValues): SubscriptionInput | null {
  const amount = parseAmount(values.amount);

  if (!values.name.trim() || !amount) {
    return null;
  }

  return {
    amount,
    color: values.color,
    icon: values.icon,
    name: values.name.trim(),
    notes: values.notes.trim() || null,
    paymentFrequency: values.paymentFrequency,
  };
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { currency, style: 'currency' }).format(amount / 100);
}

function formatDateTime(value: string) {
  return formatAppDateTime(value);
}

function formatFrequency(frequency: SubscriptionFrequency) {
  return frequencyOptions.find((option) => option.value === frequency)?.label ?? 'Mensual';
}

function getMonthlyEquivalent(subscription: Subscription) {
  if (subscription.paymentFrequency === 'weekly') {
    return subscription.amount * 52 / 12;
  }

  if (subscription.paymentFrequency === 'quarterly') {
    return subscription.amount / 3;
  }

  if (subscription.paymentFrequency === 'semiannual') {
    return subscription.amount / 6;
  }

  if (subscription.paymentFrequency === 'annual') {
    return subscription.amount / 12;
  }

  return subscription.amount;
}

export function SubscriptionsScreen() {
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getSubscriptionColorOptions(colors), [colors]);
  const stableCurrency = useMemo(
    () => (selectedNotebookId ? notebookRepository.getActiveById(selectedNotebookId)?.currency ?? 'MXN' : 'MXN'),
    [selectedNotebookId],
  );
  const stableNotebookName = useMemo(
    () => selectedNotebookName ?? (selectedNotebookId ? notebookRepository.getActiveById(selectedNotebookId)?.name ?? null : null),
    [selectedNotebookId, selectedNotebookName],
  );
  const loadSubscriptionData = useCallback((): SubscriptionData => {
    if (!selectedNotebookId) {
      return { currency: stableCurrency, subscriptions: [] };
    }

    return {
      currency: notebookRepository.getActiveById(selectedNotebookId)?.currency ?? stableCurrency,
      subscriptions: subscriptionRepository.listActiveByNotebook(selectedNotebookId),
    };
  }, [selectedNotebookId, stableCurrency]);
  const {
    data,
    error: loadError,
    isLoading,
    reload,
  } = useDeferredQuery(loadSubscriptionData, { currency: stableCurrency, subscriptions: [] });
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([]);
  const [infoSubscription, setInfoSubscription] = useState<Subscription | null>(null);
  const [deleteSubscription, setDeleteSubscription] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);
  const [showAmountError, setShowAmountError] = useState(false);
  const [actionMenuSubscriptionId, setActionMenuSubscriptionId] = useState<string | null>(null);
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubscriptionIds((current) => {
      const activeIds = new Set(data.subscriptions.map((subscription) => subscription.id));
      const next = current.filter((id) => activeIds.has(id));
      const missing = data.subscriptions
        .map((subscription) => subscription.id)
        .filter((id) => !next.includes(id));

      return [...next, ...missing];
    });
  }, [data.subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    if (frequencyFilter === 'all') {
      return data.subscriptions;
    }

    return data.subscriptions.filter((subscription) => subscription.paymentFrequency === frequencyFilter);
  }, [data.subscriptions, frequencyFilter]);
  const selectedSubscriptions = useMemo(
    () => data.subscriptions.filter((subscription) => selectedSubscriptionIds.includes(subscription.id)),
    [data.subscriptions, selectedSubscriptionIds],
  );
  const selectedTotal = selectedSubscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const monthlyAverage = data.subscriptions.reduce((sum, subscription) => sum + getMonthlyEquivalent(subscription), 0);
  const filterLabel = filterOptions.find((option) => option.value === frequencyFilter)?.label ?? 'Todas';

  const openCreate = () => {
    setFormValues(getInitialForm(colors));
    setEditingSubscription(null);
    setShowNameError(false);
    setShowAmountError(false);
    setIsFormOpen(true);
  };

  const openEdit = (subscription: Subscription) => {
    setFormValues(getFormFromSubscription(subscription, colors));
    setEditingSubscription(subscription);
    setShowNameError(false);
    setShowAmountError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSubscription(null);
    setActionMenuSubscriptionId(null);
  };

  const saveForm = () => {
    const input = toInput(formValues);
    setShowNameError(!formValues.name.trim());
    setShowAmountError(!parseAmount(formValues.amount));

    if (!input || !selectedNotebookId) {
      return;
    }

    if (editingSubscription) {
      subscriptionRepository.update(editingSubscription.id, input);
      setSnackbarMessage('Suscripcion actualizada.');
    } else {
      subscriptionRepository.create(selectedNotebookId, input);
      setSnackbarMessage('Suscripcion agregada.');
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
    setSnackbarMessage('Suscripcion archivada.');
    reload();
  };

  const toggleSubscription = (id: string) => {
    setSelectedSubscriptionIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  };

  const renderSubscription = ({ item }: { item: Subscription }) => {
    const checked = selectedSubscriptionIds.includes(item.id);
    const iconName = (item.icon as SubscriptionIconName | null) ?? 'play-box-outline';
    const color = item.color ?? colors.irisGleam;

    return (
      <Surface style={styles.subscriptionRow} elevation={0}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`Incluir ${item.name} en el pago`}
          onPress={() => toggleSubscription(item.id)}
          style={({ pressed }) => [styles.subscriptionContent, pressed && styles.subscriptionPressed]}
        >
          <View style={[styles.subscriptionIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.subscriptionName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.subscriptionMeta}>
              {formatFrequency(item.paymentFrequency)}
            </Text>
          </View>
          <View style={styles.amountCopy}>
            <Text numberOfLines={1} style={styles.subscriptionAmount}>
              {formatAmount(item.amount, data.currency)}
            </Text>
            <Text style={[styles.selectionState, checked ? styles.selectionStateChecked : null]}>
              {checked ? 'Incluida' : 'Sin incluir'}
            </Text>
          </View>
        </Pressable>

        <AppActionMenu
          visible={actionMenuSubscriptionId === item.id}
          onDismiss={() => setActionMenuSubscriptionId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la suscripcion"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.subscriptionActionsButton}
              onPress={() => setActionMenuSubscriptionId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="eye-outline"
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
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={stableNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a mas"
            icon="arrow-left"
            onPress={() => router.replace('/more')}
          />
        }
      />
      <AppScreen eyebrow="SUSCRIPCIONES" title="Pagos recurrentes">
        {!selectedNotebookId ? (
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para registrar suscripciones."
            style={styles.missingNotebook}
          />
        ) : (
          <>
            <View style={styles.topStack}>
              <View style={styles.filterSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  onPress={() => setShowFilters((current) => !current)}
                  style={({ pressed }) => [
                    styles.filterToggle,
                    pressed ? styles.filterTogglePressed : null,
                  ]}
                >
                  <Text style={styles.filterToggleText}>Filtros</Text>
                  <View style={styles.filterToggleSpacer} />
                  <View style={styles.chevronButton}>
                    <MaterialCommunityIcons
                      name={showFilters ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.mutedText}
                    />
                  </View>
                </Pressable>
                <AppAnimatedDisclosure
                  visible={showFilters}
                  maxHeight={48}
                  style={styles.filterGrid}
                >
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
                  <View style={styles.filterControl}>
                    <AppActionMenu
                      visible={selectionMenuOpen}
                      onDismiss={() => setSelectionMenuOpen(false)}
                      contentStyle={styles.menuContent}
                      anchor={
                        <IconButton
                          accessibilityLabel="Acciones de seleccion"
                          icon="playlist-check"
                          iconColor={colors.text}
                          size={20}
                          style={styles.filterIconButton}
                          onPress={() => setSelectionMenuOpen(true)}
                        />
                      }
                    >
                      <Menu.Item
                        leadingIcon="checkbox-multiple-marked-outline"
                        title="Seleccionar visibles"
                        onPress={() => {
                          setSelectedSubscriptionIds(filteredSubscriptions.map((subscription) => subscription.id));
                          setSelectionMenuOpen(false);
                        }}
                      />
                      <Menu.Item
                        leadingIcon="checkbox-multiple-blank-outline"
                        title="Limpiar seleccion"
                        onPress={() => {
                          setSelectedSubscriptionIds([]);
                          setSelectionMenuOpen(false);
                        }}
                      />
                    </AppActionMenu>
                  </View>
                </AppAnimatedDisclosure>
                <Text numberOfLines={1} style={styles.filterContextText}>
                  Periodo: {filterLabel}
                </Text>
              </View>

              <View style={styles.sectionDivider} />

              <View style={styles.summarySection}>
                <View style={styles.summaryTitleRow}>
                  <Text style={styles.summaryTitle}>RESUMEN</Text>
                  <Text style={styles.summaryCount}>{data.subscriptions.length} registradas</Text>
                </View>

                <Surface style={styles.summaryTable} elevation={0}>
                  <View style={styles.metricRow}>
                    <View style={styles.metricIcon}>
                      <MaterialCommunityIcons name="cash-check" size={18} color={colors.text} />
                    </View>
                    <View style={styles.metricCopy}>
                      <Text style={styles.metricLabel}>Seleccionadas</Text>
                      <Text style={styles.metricHint}>{selectedSubscriptions.length} incluidas</Text>
                    </View>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
                      {formatAmount(selectedTotal, data.currency)}
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricRow}>
                    <View style={styles.metricIcon}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.metricCopy}>
                      <Text style={styles.metricLabel}>Promedio mensual</Text>
                      <Text style={styles.metricHint}>Todo prorrateado</Text>
                    </View>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
                      {formatAmount(monthlyAverage, data.currency)}
                    </Text>
                  </View>
                </Surface>
              </View>
            </View>

            <FlatList
              style={styles.list}
              data={isLoading ? [] : filteredSubscriptions}
              keyExtractor={(item) => item.id}
              renderItem={renderSubscription}
              contentContainerStyle={!isLoading && filteredSubscriptions.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                isLoading ? (
                  <AppLoadingState colors={colors} label="Cargando suscripciones" />
                ) : (
                  <AppEmptyState
                    icon="calendar-sync-outline"
                    title={loadError ? 'No se pudieron cargar las suscripciones' : 'Aun no hay suscripciones'}
                    message={
                      loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Agrega pagos recurrentes para simular cuanto se juntaria en un mes.'
                    }
                    style={styles.emptyState}
                  />
                )
              }
              showsVerticalScrollIndicator={false}
            />
            <AppDraggableFab style={styles.fabWrap}>
              <AppCatFab accessibilityLabel="Nueva suscripcion" onPress={openCreate} />
            </AppDraggableFab>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoSubscription)}
          title="Informacion"
          titleIcon="eye-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoSubscription(null)}
          onDismiss={() => setInfoSubscription(null)}
        >
          {infoSubscription ? (
            <>
              <AppInfoLine label="Nombre" value={infoSubscription.name} />
              <AppInfoLine label="Monto" value={formatAmount(infoSubscription.amount, data.currency)} />
              <AppInfoLine label="Frecuencia" value={formatFrequency(infoSubscription.paymentFrequency)} />
              <AppInfoLine label="Promedio mensual" value={formatAmount(getMonthlyEquivalent(infoSubscription), data.currency)} />
              <AppInfoLine label="Notas" value={infoSubscription.notes || 'Sin notas'} />
              <AppInfoLine label="Creacion" value={formatDateTime(infoSubscription.createdAt)} />
              <AppInfoLine label="Actualizacion" value={formatDateTime(infoSubscription.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <SubscriptionFormDialog
          colorOptions={colorOptions}
          showAmountError={showAmountError}
          showNameError={showNameError}
          styles={styles}
          title={editingSubscription ? 'Editar suscripcion' : 'Nueva suscripcion'}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteSubscription)}
          title="Eliminar suscripcion"
          message="Esta accion archivara la suscripcion y dejara de mostrarse."
          confirmLabel="Confirmar"
          onCancel={() => setDeleteSubscription(null)}
          onConfirm={confirmDelete}
        />
      </Portal>

      <AppMeowneySnackbar message={snackbarMessage} onDismiss={() => setSnackbarMessage(null)} />
    </View>
  );
}

type SubscriptionFormDialogProps = {
  colorOptions: string[];
  showAmountError: boolean;
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
  colorOptions,
  showAmountError,
  showNameError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: SubscriptionFormDialogProps) {
  return (
    <AppFormDialog visible={visible} title={title} contentContainerStyle={styles.form} onCancel={onCancel} onSave={onSave}>
      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>NOMBRE</Text>
        <TextInput
          mode="outlined"
          placeholder="Ej. Netflix"
          value={values.name}
          onChangeText={(name) => onChange({ ...values, name })}
          error={showNameError}
        />
        {showNameError ? <HelperText type="error" visible>El nombre es obligatorio.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>MONTO</Text>
        <TextInput
          mode="outlined"
          placeholder="Ej. 199.00"
          keyboardType="decimal-pad"
          value={values.amount}
          onChangeText={(amount) => onChange({ ...values, amount })}
          error={showAmountError}
        />
        {showAmountError ? <HelperText type="error" visible>Ingresa un monto mayor a cero.</HelperText> : null}
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
          onSelect={(paymentFrequency) => onChange({ ...values, paymentFrequency })}
        />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>NOTAS</Text>
        <AppDescriptionInput
          placeholder="Ej. Plan familiar"
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
    topStack: {
      gap: spacing.ms,
      marginBottom: spacing.sm,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    summarySection: {
      gap: spacing.sm,
    },
    summaryTitleRow: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    summaryTable: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    summaryTitle: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    summaryCount: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    metricRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    metricIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
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
      textAlign: 'right',
    },
    metricDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    filterSection: {
      alignItems: 'stretch',
      gap: 2,
    },
    filterToggle: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
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
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingBottom: 96,
    },
    emptyContent: {
      flexGrow: 1,
      paddingBottom: 96,
    },
    subscriptionRow: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    subscriptionContent: {
      minHeight: 78,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
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
      alignItems: 'center',
      justifyContent: 'center',
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
      lineHeight: 20,
    },
    amountCopy: {
      minWidth: 104,
      maxWidth: 132,
      flexShrink: 0,
      alignItems: 'flex-end',
      gap: 3,
    },
    subscriptionAmount: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.mediumWeight,
      lineHeight: 22,
      textAlign: 'right',
    },
    selectionState: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
      lineHeight: 16,
      textTransform: 'uppercase',
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
    fabWrap: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 88,
      alignItems: 'flex-end',
      gap: spacing.sm,
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
