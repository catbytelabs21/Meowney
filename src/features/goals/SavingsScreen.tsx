import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, IconButton, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import {
  GOAL_ICON_OPTIONS,
  getGoalColorOptions,
  type GoalIconName,
} from '@/constants/goals';
import { accountRepository } from '@/database/repositories/account.repository';
import { goalRepository, type GoalInput } from '@/database/repositories/goal.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDate, formatAppDateTime } from '@/utils/dateFormat';
import type { Account } from '@/features/accounts/types';
import type { GoalListItem } from './types';

type SavingFormValues = {
  accountId: string;
  color: string;
  description: string;
  icon: GoalIconName;
  name: string;
  targetAmount: string;
  targetDate: string;
};

type SavingsData = {
  accounts: Account[];
  currency: string;
  goals: GoalListItem[];
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultTargetDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return toDateKey(date);
}

function getInitialForm(accounts: Account[], colors: MeowneyColors): SavingFormValues {
  return {
    accountId: accounts[0]?.id ?? '',
    color: colors.cyanSignal,
    description: '',
    icon: 'piggy-bank-outline',
    name: '',
    targetAmount: '',
    targetDate: getDefaultTargetDate(),
  };
}

function getFormFromGoal(goal: GoalListItem, colors: MeowneyColors): SavingFormValues {
  const fallback = getInitialForm([], colors);

  return {
    accountId: goal.accountId,
    color: goal.color ?? fallback.color,
    description: goal.description ?? '',
    icon: (goal.icon as GoalIconName | null) ?? fallback.icon,
    name: goal.name,
    targetAmount: String(goal.targetAmount / 100),
    targetDate: goal.targetDate,
  };
}

function parseAmount(value: string) {
  const normalized = value.replace(',', '.').trim();
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function toInput(values: SavingFormValues): GoalInput | null {
  const targetAmount = parseAmount(values.targetAmount);

  if (!values.accountId || !values.name.trim() || !targetAmount || !isDateKey(values.targetDate)) {
    return null;
  }

  return {
    accountId: values.accountId,
    color: values.color,
    description: values.description.trim() || null,
    icon: values.icon,
    name: values.name.trim(),
    targetAmount,
    targetDate: values.targetDate.trim(),
  };
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { currency, style: 'currency' }).format(amount / 100);
}

function formatDate(value: string) {
  return formatAppDate(value);
}

function formatDateTime(value: string) {
  return formatAppDateTime(value);
}

export function SavingsScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getGoalColorOptions(colors), [colors]);
  const stableNotebookName = useMemo(() => {
    return selectedNotebookName ?? (activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.name ?? null : null);
  }, [activeNotebookId, selectedNotebookName]);
  const stableCurrency = useMemo(
    () => (activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.currency ?? 'MXN' : 'MXN'),
    [activeNotebookId],
  );
  const loadSavingsData = useCallback((): SavingsData => {
    if (!activeNotebookId) {
      return { accounts: [], currency: stableCurrency, goals: [] };
    }

    return {
      accounts: accountRepository.listActiveByNotebook(activeNotebookId),
      currency: notebookRepository.getActiveById(activeNotebookId)?.currency ?? stableCurrency,
      goals: goalRepository.listActiveByNotebook(activeNotebookId),
    };
  }, [activeNotebookId, stableCurrency]);
  const {
    data,
    error: loadError,
    isLoading,
    reload,
  } = useDeferredQuery(loadSavingsData, { accounts: [], currency: stableCurrency, goals: [] });
  const [infoGoal, setInfoGoal] = useState<GoalListItem | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<GoalListItem | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm([], colors));
  const [showAmountError, setShowAmountError] = useState(false);
  const [showDateError, setShowDateError] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const [showAccountError, setShowAccountError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (routeNotebookId && routeNotebookId !== selectedNotebookId) {
      setSelectedNotebookId(routeNotebookId, notebookRepository.getActiveById(routeNotebookId)?.name ?? null);
    }
  }, [routeNotebookId, selectedNotebookId, setSelectedNotebookId]);

  const openCreate = () => {
    setFormValues(getInitialForm(data.accounts, colors));
    setEditingGoal(null);
    setShowAmountError(false);
    setShowDateError(false);
    setShowNameError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const openEdit = (goal: GoalListItem) => {
    setFormValues(getFormFromGoal(goal, colors));
    setEditingGoal(goal);
    setShowAmountError(false);
    setShowDateError(false);
    setShowNameError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  const saveForm = () => {
    const input = toInput(formValues);
    setShowNameError(!formValues.name.trim());
    setShowAccountError(!formValues.accountId);
    setShowAmountError(!parseAmount(formValues.targetAmount));
    setShowDateError(!isDateKey(formValues.targetDate));

    if (!input) {
      return;
    }

    if (editingGoal) {
      goalRepository.update(editingGoal.id, input);
      setSnackbarMessage('Tesoro actualizado y guardado en la guarida.');
    } else {
      goalRepository.create(input);
      setSnackbarMessage('Nuevo tesoro listo para crecer.');
    }

    closeForm();
    reload();
  };

  const confirmDelete = () => {
    if (!deleteGoal) {
      return;
    }

    goalRepository.archive(deleteGoal.id);
    setDeleteGoal(null);
    setSnackbarMessage('Tesoro archivado fuera de la guarida.');
    reload();
  };

  const renderGoal = ({ item }: { item: GoalListItem }) => {
    const iconName = (item.icon as GoalIconName | null) ?? 'piggy-bank-outline';
    const color = item.color ?? colors.cyanSignal;

    return (
      <Surface style={styles.row} elevation={0}>
        <View style={styles.goalIdentity}>
          <View style={[styles.goalIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.goalName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.goalAmount}>
              {formatAmount(item.targetAmount, data.currency)}
            </Text>
            <Text numberOfLines={1} style={styles.goalMeta}>
              {item.accountName} - {formatDate(item.targetDate)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <IconButton icon="information-outline" mode="contained-tonal" size={18} iconColor={colors.text} containerColor={colors.selected} style={styles.actionButton} onPress={() => setInfoGoal(item)} accessibilityLabel="Ver informacion" />
          <IconButton icon="pencil-outline" mode="contained-tonal" size={18} iconColor={colors.text} containerColor={colors.selected} style={styles.actionButton} onPress={() => openEdit(item)} accessibilityLabel="Editar ahorro" />
          <IconButton icon="trash-can-outline" mode="contained-tonal" size={18} iconColor={colors.error} containerColor={colors.selected} style={styles.actionButton} onPress={() => setDeleteGoal(item)} accessibilityLabel="Eliminar ahorro" />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={stableNotebookName ?? 'Meowney'}
        left={<AppHeaderActionButton accessibilityLabel="Regresar a mas" icon="arrow-left" onPress={() => router.back()} />}
      />
      <AppScreen eyebrow="AHORROS" title="Tesoros y reservas">
          {!activeNotebookId ? (
            <AppEmptyState
              icon="book-alert-outline"
              title="Selecciona una libreta"
              message="Entra primero a una guarida para guardar tus tesoros."
              style={styles.missingNotebook}
            />
          ) : (
            <Surface style={styles.table} elevation={0}>
              <View style={styles.tableHeader}>
                <Text style={styles.columnLabel}>AHORRO</Text>
                <Text style={[styles.columnLabel, styles.actionsLabel]}>ACCIONES</Text>
              </View>
              <Divider />
              <FlatList
                style={styles.list}
                data={isLoading ? [] : data.goals}
                keyExtractor={(item) => item.id}
                renderItem={renderGoal}
                contentContainerStyle={!isLoading && data.goals.length ? styles.listContent : styles.emptyContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  isLoading ? (
                    <AppLoadingState colors={colors} label="Cargando ahorros" />
                  ) : (
                    <AppEmptyState
                      icon="piggy-bank-outline"
                      title={loadError ? 'No se pudieron cargar los ahorros' : 'Aun no hay tesoros'}
                      message={loadError ? 'Intenta entrar de nuevo o revisa la base de datos.' : 'Crea una meta para separar objetivos, reservas y pequenos botines.'}
                      style={styles.emptyState}
                    />
                  )
                }
              />
              <Divider />
              <View style={styles.fixedAction}>
                <Button mode="contained" icon="plus" onPress={openCreate} disabled={data.accounts.length === 0} buttonColor={colors.primary} textColor={colors.onPrimary} style={styles.createButton} contentStyle={styles.createButtonContent}>
                  Nuevo ahorro
                </Button>
              </View>
            </Surface>
          )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoGoal)}
          title="Informacion"
          titleIcon="eye-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoGoal(null)}
          onDismiss={() => setInfoGoal(null)}
        >
          {infoGoal ? (
            <>
              <AppInfoLine label="Titulo" value={infoGoal.name} />
              <AppInfoLine label="Descripcion" value={infoGoal.description || 'Sin descripcion'} />
              <AppInfoLine label="Cuenta" value={infoGoal.accountName} />
              <AppInfoLine label="Objetivo" value={formatAmount(infoGoal.targetAmount, data.currency)} />
              <AppInfoLine label="Fecha objetivo" value={formatDate(infoGoal.targetDate)} />
              <AppInfoLine label="Creacion" value={formatDateTime(infoGoal.createdAt)} />
              <AppInfoLine label="Actualizacion" value={formatDateTime(infoGoal.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <SavingFormDialog
          accounts={data.accounts}
          colorOptions={colorOptions}
          showAccountError={showAccountError}
          showAmountError={showAmountError}
          showDateError={showDateError}
          showNameError={showNameError}
          styles={styles}
          title={editingGoal ? 'Editar ahorro' : 'Nuevo ahorro'}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteGoal)}
          title="Eliminar ahorro"
          message="Esta accion archivara el ahorro y dejara de mostrarse."
          confirmLabel="Confirmar"
          onCancel={() => setDeleteGoal(null)}
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

type SavingFormDialogProps = {
  accounts: Account[];
  colorOptions: string[];
  showAccountError: boolean;
  showAmountError: boolean;
  showDateError: boolean;
  showNameError: boolean;
  styles: ReturnType<typeof createStyles>;
  title: string;
  values: SavingFormValues;
  visible: boolean;
  onCancel: () => void;
  onChange: (values: SavingFormValues) => void;
  onSave: () => void;
};

function SavingFormDialog({
  accounts,
  colorOptions,
  showAccountError,
  showAmountError,
  showDateError,
  showNameError,
  styles,
  title,
  values,
  visible,
  onCancel,
  onChange,
  onSave,
}: SavingFormDialogProps) {
  const selectedAccount = accounts.find((account) => account.id === values.accountId);

  return (
    <AppFormDialog visible={visible} title={title} contentContainerStyle={styles.form} onCancel={onCancel} onSave={onSave}>
      <View style={styles.fieldGroup}>
        <Text style={styles.pickerLabel}>NOMBRE</Text>
        <TextInput mode="outlined" placeholder="Ej. Viaje" value={values.name} onChangeText={(name) => onChange({ ...values, name })} error={showNameError} />
        {showNameError ? <HelperText type="error" visible>El nombre es obligatorio.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <TextInput mode="outlined" placeholder="Ej. Fondo para vacaciones" value={values.description} multiline numberOfLines={3} onChangeText={(description) => onChange({ ...values, description })} />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>CUENTA</Text>
        <AppSelectMenu
          icon="chevron-down"
          label="Cuenta"
          options={accounts.map((account) => ({
            label: account.name,
            value: account.id,
          }))}
          selectedLabel={selectedAccount?.name ?? 'Seleccionar cuenta'}
          selectedValue={values.accountId}
          buttonStyle={styles.select}
          buttonContentStyle={styles.selectContent}
          menuContentStyle={styles.menuContent}
          onSelect={(accountId) => onChange({ ...values, accountId })}
        />
        {showAccountError ? <HelperText type="error" visible>Selecciona una cuenta.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>MONTO OBJETIVO</Text>
        <TextInput mode="outlined" placeholder="Ej. 10000.00" keyboardType="decimal-pad" value={values.targetAmount} onChangeText={(targetAmount) => onChange({ ...values, targetAmount })} error={showAmountError} />
        {showAmountError ? <HelperText type="error" visible>Ingresa un monto mayor a cero.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>FECHA OBJETIVO</Text>
        <TextInput mode="outlined" placeholder="Ej. 2026-12-31" value={values.targetDate} onChangeText={(targetDate) => onChange({ ...values, targetDate })} error={showDateError} />
        {showDateError ? <HelperText type="error" visible>Usa el formato aaaa-mm-dd.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>ICONO</Text>
        <AppIconPickerGrid
          columns={5}
          icons={GOAL_ICON_OPTIONS}
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
    safeArea: { flex: 1, backgroundColor: colors.background },
    table: {
      flex: 1,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    tableHeader: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    columnLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    actionsLabel: { minWidth: 104, textAlign: 'center' },
    list: { flex: 1 },
    listContent: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.md },
    emptyContent: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.md },
    row: {
      minHeight: 84,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    goalIdentity: {
      minHeight: 84,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.ms,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
    },
    goalIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.input,
    },
    nameCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    goalName: { color: colors.text, fontSize: typography.bodySize, fontWeight: typography.bodyWeight },
    goalAmount: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
      lineHeight: 20,
    },
    goalMeta: { color: colors.mutedText, fontSize: typography.bodySmallSize, lineHeight: 20 },
    actions: {
      width: 104,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-end',
      paddingRight: spacing.xs,
    },
    actionButton: { width: 32, height: 32, margin: 0 },
    separator: { height: spacing.sm },
    emptyState: {
      flex: 1,
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
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
    fixedAction: { padding: spacing.md, backgroundColor: colors.surface },
    createButton: { borderRadius: radii.button },
    createButtonContent: { minHeight: 48 },
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
    fieldGroup: { gap: spacing.sm },
    pickerGroup: { gap: spacing.sm },
    pickerLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    select: { borderRadius: radii.button },
    selectContent: { minHeight: 48, flexDirection: 'row-reverse' },
    menuContent: { borderRadius: radii.card, backgroundColor: colors.surfaceAlt },
  });
}




