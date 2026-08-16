import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, HelperText, IconButton, Menu, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
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

type GoalIconName = keyof typeof MaterialCommunityIcons.glyphMap;

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

const iconOptions: GoalIconName[] = [
  'piggy-bank-outline',
  'home-outline',
  'airplane',
  'car-outline',
  'school-outline',
  'gift-outline',
  'shield-check-outline',
  'laptop',
  'heart-outline',
  'star-outline',
];

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
  const colorOptions = useMemo(() => getColorOptions(colors), [colors]);
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
    } else {
      goalRepository.create(input);
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
      <AppScreen eyebrow="AHORROS" title="Metas y reservas">
          {!activeNotebookId ? (
            <Surface style={styles.missingNotebook} elevation={0}>
              <MaterialCommunityIcons name="book-alert-outline" size={36} color={colors.mutedText} />
              <Text style={styles.emptyTitle}>Selecciona una libreta</Text>
              <Text style={styles.emptyText}>Entra primero a una libreta para crear ahorros.</Text>
            </Surface>
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
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="piggy-bank-outline" size={36} color={colors.mutedText} />
                      <Text style={styles.emptyTitle}>{loadError ? 'No se pudieron cargar los ahorros' : 'Aun no hay ahorros'}</Text>
                      <Text style={styles.emptyText}>{loadError ? 'Intenta entrar de nuevo o revisa la base de datos.' : 'Crea una meta para separar objetivos y reservas.'}</Text>
                    </View>
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
        <Dialog visible={Boolean(infoGoal)} onDismiss={() => setInfoGoal(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Informacion</Dialog.Title>
          <Dialog.Content>
            {infoGoal ? (
              <View style={styles.infoList}>
                <InfoLine label="Titulo" value={infoGoal.name} />
                <InfoLine label="Descripcion" value={infoGoal.description || 'Sin descripcion'} />
                <InfoLine label="Cuenta" value={infoGoal.accountName} />
                <InfoLine label="Objetivo" value={formatAmount(infoGoal.targetAmount, data.currency)} />
                <InfoLine label="Fecha objetivo" value={formatDate(infoGoal.targetDate)} />
                <InfoLine label="Creacion" value={formatDateTime(infoGoal.createdAt)} />
                <InfoLine label="Actualizacion" value={formatDateTime(infoGoal.updatedAt)} />
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInfoGoal(null)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>

        <SavingFormDialog
          accounts={data.accounts}
          colorOptions={colorOptions}
          colors={colors}
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

        <Dialog visible={Boolean(deleteGoal)} onDismiss={() => setDeleteGoal(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Eliminar ahorro</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Esta accion archivara el ahorro y dejara de mostrarse.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteGoal(null)}>Cancelar</Button>
            <Button textColor={colors.error} onPress={confirmDelete}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

type SavingFormDialogProps = {
  accounts: Account[];
  colorOptions: string[];
  colors: MeowneyColors;
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
  colors,
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
        <Menu
          visible={accountMenuOpen}
          onDismiss={() => setAccountMenuOpen(false)}
          contentStyle={styles.menuContent}
          anchor={
            <Button mode="outlined" icon="chevron-down" onPress={() => setAccountMenuOpen(true)} style={styles.select} contentStyle={styles.selectContent} textColor={colors.text}>
              {selectedAccount?.name ?? 'Seleccionar cuenta'}
            </Button>
          }
        >
          {accounts.map((account) => (
            <Menu.Item key={account.id} title={account.name} onPress={() => {
              onChange({ ...values, accountId: account.id });
              setAccountMenuOpen(false);
            }} />
          ))}
        </Menu>
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
        <View style={styles.choiceGrid}>
          {iconOptions.map((icon) => {
            const selected = values.icon === icon;
            return <IconButton key={icon} icon={icon} size={22} mode="contained-tonal" iconColor={selected ? colors.onPrimary : colors.text} containerColor={selected ? colors.primary : colors.selected} style={styles.iconChoice} onPress={() => onChange({ ...values, icon })} accessibilityLabel={`Icono ${icon}`} />;
          })}
        </View>
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>COLOR</Text>
        <View style={styles.swatchTray}>
          {colorOptions.map((color) => {
            const selected = values.color === color;
            return (
              <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Color ${color}`} onPress={() => onChange({ ...values, color })} style={[styles.colorChoice, { backgroundColor: color }, selected && styles.colorChoiceSelected]}>
                {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.void} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </AppFormDialog>
  );
}

type InfoLineProps = { label: string; value: string };

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { gap: spacing.xs },
  label: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  value: { fontSize: typography.bodySize, lineHeight: 24 },
});

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    contentSafeArea: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.background,
    },
    header: { gap: spacing.sm },
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
    emptyTitle: {
      color: colors.text,
      fontSize: typography.subheadingSize,
      fontWeight: typography.bodyWeight,
      textAlign: 'center',
    },
    emptyText: { color: colors.mutedText, fontSize: typography.bodySmallSize, lineHeight: 22, textAlign: 'center' },
    fixedAction: { padding: spacing.md, backgroundColor: colors.surface },
    createButton: { borderRadius: radii.button },
    createButtonContent: { minHeight: 48 },
    dialog: { borderRadius: radii.card, backgroundColor: colors.surface },
    dialogTitle: { color: colors.text, fontWeight: typography.bodyWeight },
    dialogText: { color: colors.mutedText, fontSize: typography.bodySize, lineHeight: 24 },
    infoList: { gap: spacing.md },
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
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconChoice: { width: 40, height: 40, margin: 0 },
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
    colorChoiceSelected: { borderWidth: 2, borderColor: colors.text },
  });
}


