import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Divider, HelperText, IconButton, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import {
  SAVING_ICON_OPTIONS,
  getSavingColorOptions,
  type SavingIconName,
} from '@/constants/savings';
import { accountRepository } from '@/database/repositories/account.repository';
import { savingRepository, type SavingInput } from '@/database/repositories/saving.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { getMeowneyColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDate, formatAppDateTime, isDateKey } from '@/utils/dateFormat';
import { formatMoneyFromCents, parseMoneyToCents } from '@/utils/moneyFormat';
import type { Account } from '@/features/accounts/types';
import type { SavingListItem } from './types';

type SavingFormValues = {
  accountId: string;
  color: string;
  description: string;
  icon: SavingIconName;
  name: string;
  targetAmount: string;
  targetDate: string;
};

type SavingsData = {
  accounts: Account[];
  currency: string;
  savings: SavingListItem[];
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

function getFormFromSaving(saving: SavingListItem, colors: MeowneyColors): SavingFormValues {
  const fallback = getInitialForm([], colors);

  return {
    accountId: saving.accountId,
    color: saving.color ?? fallback.color,
    description: saving.description ?? '',
    icon: (saving.icon as SavingIconName | null) ?? fallback.icon,
    name: saving.name,
    targetAmount: String(saving.targetAmount / 100),
    targetDate: saving.targetDate,
  };
}

function toInput(values: SavingFormValues): SavingInput | null {
  const targetAmount = parseMoneyToCents(values.targetAmount);

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

export function SavingsScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getSavingColorOptions(colors), [colors]);
  const stableNotebookName = useMemo(() => {
    return selectedNotebookName ?? (activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.name ?? null : null);
  }, [activeNotebookId, selectedNotebookName]);
  const stableCurrency = useMemo(
    () => (activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.currency ?? 'MXN' : 'MXN'),
    [activeNotebookId],
  );
  const loadSavingsData = useCallback((): SavingsData => {
    if (!activeNotebookId) {
      return { accounts: [], currency: stableCurrency, savings: [] };
    }

    return {
      accounts: accountRepository.listActiveByNotebook(activeNotebookId),
      currency: notebookRepository.getActiveById(activeNotebookId)?.currency ?? stableCurrency,
      savings: savingRepository.listActiveByNotebook(activeNotebookId),
    };
  }, [activeNotebookId, stableCurrency]);
  const {
    data,
    error: loadError,
    isLoading,
    reload,
  } = useDeferredQuery(loadSavingsData, { accounts: [], currency: stableCurrency, savings: [] });
  const [infoSaving, setInfoSaving] = useState<SavingListItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState<SavingListItem | null>(null);
  const [editingSaving, setEditingSaving] = useState<SavingListItem | null>(null);
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
    setEditingSaving(null);
    setShowAmountError(false);
    setShowDateError(false);
    setShowNameError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const openEdit = (saving: SavingListItem) => {
    setFormValues(getFormFromSaving(saving, colors));
    setEditingSaving(saving);
    setShowAmountError(false);
    setShowDateError(false);
    setShowNameError(false);
    setShowAccountError(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSaving(null);
  };

  const saveForm = () => {
    const input = toInput(formValues);
    setShowNameError(!formValues.name.trim());
    setShowAccountError(!formValues.accountId);
    setShowAmountError(!parseMoneyToCents(formValues.targetAmount));
    setShowDateError(!isDateKey(formValues.targetDate));

    if (!input) {
      return;
    }

    if (editingSaving) {
      savingRepository.update(editingSaving.id, input);
      setSnackbarMessage('Tesoro actualizado y guardado en la guarida.');
    } else {
      savingRepository.create(input);
      setSnackbarMessage('Ahorro agregado y listo para crecer.');
    }

    closeForm();
    reload();
  };

  const confirmDelete = () => {
    if (!deleteSaving) {
      return;
    }

    savingRepository.archive(deleteSaving.id);
    setDeleteSaving(null);
    setSnackbarMessage('Tesoro archivado fuera de la guarida.');
    reload();
  };

  const renderSaving = ({ item }: { item: SavingListItem }) => {
    const iconName = (item.icon as SavingIconName | null) ?? 'piggy-bank-outline';
    const color = item.color ?? colors.cyanSignal;

    return (
      <Surface style={styles.row} elevation={0}>
        <View style={styles.savingIdentity}>
          <View style={[styles.savingIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.savingName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.savingAmount}>
              {formatMoneyFromCents(item.targetAmount, data.currency)}
            </Text>
            <Text numberOfLines={1} style={styles.savingMeta}>
              {item.accountName} - {formatAppDate(item.targetDate)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <IconButton icon="information-outline" mode="contained-tonal" size={18} iconColor={colors.text} containerColor={colors.selected} style={styles.actionButton} onPress={() => setInfoSaving(item)} accessibilityLabel="Ver información" />
          <IconButton icon="pencil-outline" mode="contained-tonal" size={18} iconColor={colors.text} containerColor={colors.selected} style={styles.actionButton} onPress={() => openEdit(item)} accessibilityLabel="Editar ahorro" />
          <IconButton icon="trash-can-outline" mode="contained-tonal" size={18} iconColor={colors.error} containerColor={colors.selected} style={styles.actionButton} onPress={() => setDeleteSaving(item)} accessibilityLabel="Eliminar ahorro" />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={stableNotebookName ?? 'Meowney'}
        left={<AppHeaderActionButton accessibilityLabel="Regresar a Mi libreta" icon="arrow-left" onPress={() => router.back()} />}
      />
      <AppScreen
        eyebrow="AHORROS"
        helpTitle="¿Para qué sirven los ahorros?"
        helpMessage="Los ahorros son tesoros que Meowney te ayuda a apartar para una meta. Puedes seguir cuánto llevas, cuánto falta y en qué cuenta está guardado ese dinero."
      >
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
                data={isLoading ? [] : data.savings}
                keyExtractor={(item) => item.id}
                renderItem={renderSaving}
                contentContainerStyle={!isLoading && data.savings.length ? styles.listContent : styles.emptyContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  isLoading ? (
                    <AppLoadingState colors={colors} label="Cargando ahorros" />
                  ) : (
                    <AppEmptyState
                      icon="piggy-bank-outline"
                      title={loadError ? 'No se pudieron cargar los ahorros' : 'Aún no hay tesoros'}
                      message={loadError ? 'Intenta entrar de nuevo o revisa la base de datos.' : 'Aquí aparecerán tus metas de ahorro. Crea un tesoro para apartar dinero para viajes, emergencias, compras o cualquier objetivo.'}
                      style={styles.emptyState}
                    />
                  )
                }
              />
              <Divider />
              <View style={styles.fixedAction}>
                <AppCatFab
                  accessibilityLabel="Agregar ahorro"
                  disabled={data.accounts.length === 0}
                  label="Agregar ahorro"
                  style={styles.createButton}
                  onPress={openCreate}
                />
              </View>
            </Surface>
          )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoSaving)}
          title="Información"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoSaving(null)}
          onDismiss={() => setInfoSaving(null)}
        >
          {infoSaving ? (
            <>
              <AppInfoLine label="Título" value={infoSaving.name} />
              <AppInfoLine label="Descripción" value={infoSaving.description || 'Sin descripción'} />
              <AppInfoLine label="Cuenta" value={infoSaving.accountName} />
              <AppInfoLine label="Objetivo" value={formatMoneyFromCents(infoSaving.targetAmount, data.currency)} />
              <AppInfoLine label="Fecha objetivo" value={formatAppDate(infoSaving.targetDate)} />
              <AppInfoLine label="Creación" value={formatAppDateTime(infoSaving.createdAt)} />
              <AppInfoLine label="Actualización" value={formatAppDateTime(infoSaving.updatedAt)} />
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
          title={editingSaving ? 'Editar ahorro' : 'Agregar ahorro'}
          values={formValues}
          visible={isFormOpen}
          onCancel={closeForm}
          onChange={setFormValues}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteSaving)}
          title="Eliminar ahorro"
          message="Esta acción archivará el ahorro y dejará de mostrarse."
          confirmLabel="Confirmar"
          onCancel={() => setDeleteSaving(null)}
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
        <TextInput mode="outlined" placeholder="Ej. Viaje, Emergencia o Auto" value={values.name} onChangeText={(name) => onChange({ ...values, name })} error={showNameError} />
        {showNameError ? <HelperText type="error" visible>Escribe un nombre para esta meta.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <TextInput mode="outlined" placeholder="Ej. Dinero apartado para vacaciones" value={values.description} multiline numberOfLines={3} onChangeText={(description) => onChange({ ...values, description })} />
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
        {showAccountError ? <HelperText type="error" visible>Elige en que cuenta se guardara este ahorro.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>MONTO OBJETIVO</Text>
        <TextInput mode="outlined" placeholder="Ej. 10000" keyboardType="decimal-pad" value={values.targetAmount} onChangeText={(targetAmount) => onChange({ ...values, targetAmount })} error={showAmountError} />
        {showAmountError ? <HelperText type="error" visible>Escribe cuánto quieres juntar, mayor a cero.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>FECHA OBJETIVO</Text>
        <TextInput mode="outlined" placeholder="Ej. 2026-12-31" value={values.targetDate} onChangeText={(targetDate) => onChange({ ...values, targetDate })} error={showDateError} />
        {showDateError ? <HelperText type="error" visible>Usa una fecha valida en formato aaaa-mm-dd.</HelperText> : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>ICONO</Text>
        <AppIconPickerGrid
          columns={5}
          icons={SAVING_ICON_OPTIONS}
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
    savingIdentity: {
      minHeight: 84,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.ms,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
    },
    savingIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.input,
    },
    nameCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    savingName: { color: colors.text, fontSize: typography.bodySize, fontWeight: typography.bodyWeight },
    savingAmount: {
      color: colors.text,
      fontSize: typography.bodySmallSize,
      fontWeight: typography.mediumWeight,
      lineHeight: 20,
    },
    savingMeta: { color: colors.mutedText, fontSize: typography.bodySmallSize, lineHeight: 20 },
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
    fixedAction: {
      alignItems: 'center',
      marginHorizontal: -spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    createButton: { width: '70%' },
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




