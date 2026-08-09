import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  HelperText,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { accountRepository, type AccountInput } from '@/database/repositories/account.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { Account, AccountType } from './types';

type AccountIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type AccountFormValues = {
  name: string;
  description: string;
  type: AccountType;
  icon: AccountIconName;
  color: string;
};

const iconOptions: AccountIconName[] = [
  'wallet-outline',
  'bank-outline',
  'cash',
  'credit-card-outline',
  'piggy-bank-outline',
  'safe-square-outline',
  'briefcase-outline',
  'home-outline',
  'cart-outline',
  'chart-line',
];

const accountTypeOptions: { label: string; value: AccountType }[] = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Banco', value: 'BANK_ACCOUNT' },
  { label: 'Debito', value: 'DEBIT_CARD' },
  { label: 'Wallet', value: 'DIGITAL_WALLET' },
  { label: 'Inversion', value: 'INVESTMENT' },
  { label: 'Otro', value: 'OTHER' },
];

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

function getInitialForm(colors: MeowneyColors): AccountFormValues {
  return {
    name: '',
    description: '',
    type: 'OTHER',
    icon: 'wallet-outline',
    color: colors.cyanSignal,
  };
}

function getFormFromAccount(account: Account, colors: MeowneyColors): AccountFormValues {
  const fallback = getInitialForm(colors);

  return {
    name: account.name,
    description: account.description ?? '',
    type: account.type,
    icon: (account.icon as AccountIconName | null) ?? fallback.icon,
    color: account.color ?? fallback.color,
  };
}

function toInput(notebookId: string, values: AccountFormValues): AccountInput {
  return {
    notebookId,
    name: values.name.trim(),
    description: values.description.trim() || null,
    type: values.type,
    icon: values.icon,
    color: values.color,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatAccountType(type: AccountType) {
  return accountTypeOptions.find((option) => option.value === type)?.label ?? 'Otro';
}

export function AccountsScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getColorOptions(colors), [colors]);

  const loadAccountsData = useCallback(() => {
    if (!activeNotebookId) {
      return { accounts: [], notebookName: selectedNotebookName };
    }

    return {
      accounts: accountRepository.listActiveByNotebook(activeNotebookId),
      notebookName: selectedNotebookName ?? notebookRepository.getActiveById(activeNotebookId)?.name ?? null,
    };
  }, [activeNotebookId, selectedNotebookName]);
  const {
    data: accountsData,
    error: loadError,
    isLoading,
    reload: reloadAccounts,
  } = useDeferredQuery(loadAccountsData, { accounts: [], notebookName: selectedNotebookName });
  const { accounts, notebookName: activeNotebookName } = accountsData;
  const [infoAccount, setInfoAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);

  useEffect(() => {
    if (routeNotebookId && routeNotebookId !== selectedNotebookId) {
      setSelectedNotebookId(routeNotebookId);
    }
  }, [routeNotebookId, selectedNotebookId, setSelectedNotebookId]);

  const openCreate = () => {
    setFormValues(getInitialForm(colors));
    setShowNameError(false);
    setIsCreateOpen(true);
  };

  const openEdit = (account: Account) => {
    setFormValues(getFormFromAccount(account, colors));
    setShowNameError(false);
    setEditingAccount(account);
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingAccount(null);
    setShowNameError(false);
  };

  const saveForm = () => {
    if (!activeNotebookId) {
      return;
    }

    if (!formValues.name.trim()) {
      setShowNameError(true);
      return;
    }

    if (editingAccount) {
      accountRepository.update(editingAccount.id, toInput(activeNotebookId, formValues));
    } else {
      accountRepository.create(toInput(activeNotebookId, formValues));
    }

    closeForm();
    reloadAccounts();
  };

  const confirmDelete = () => {
    if (!deleteAccount || !activeNotebookId) {
      return;
    }

    accountRepository.archive(deleteAccount.id, activeNotebookId);
    setDeleteAccount(null);
    reloadAccounts();
  };

  const renderAccount = ({ item }: { item: Account }) => {
    const iconName = (item.icon as AccountIconName | null) ?? 'wallet-outline';
    const color = item.color ?? colors.cyanSignal;

    return (
      <Surface style={styles.row} elevation={0}>
        <View style={styles.accountIdentity}>
          <View style={[styles.accountIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.accountName}>
              {item.name}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <IconButton
            icon="information-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.text}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => setInfoAccount(item)}
            accessibilityLabel="Ver informacion"
          />
          <IconButton
            icon="pencil-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.text}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => openEdit(item)}
            accessibilityLabel="Editar cuenta"
          />
          <IconButton
            icon="trash-can-outline"
            mode="contained-tonal"
            size={18}
            iconColor={colors.error}
            containerColor={colors.selected}
            style={styles.actionButton}
            onPress={() => setDeleteAccount(item)}
            accessibilityLabel="Eliminar cuenta"
          />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={activeNotebookName ?? 'Cuentas'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a mas"
            icon="arrow-left"
            onPress={() => router.push('/more')}
          />
        }
      />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.contentSafeArea}>
        <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CUENTAS</Text>
          <Text style={styles.title}>Activos y tarjetas</Text>
        </View>

        {!activeNotebookId ? (
          <Surface style={styles.missingNotebook} elevation={0}>
            <MaterialCommunityIcons name="book-alert-outline" size={36} color={colors.mutedText} />
            <Text style={styles.emptyTitle}>Selecciona una libreta</Text>
            <Text style={styles.emptyText}>
              Entra primero a una libreta para que las cuentas se guarden en el lugar correcto.
            </Text>
            <Button mode="contained" onPress={() => router.replace('/notebooks')}>
              Ir a libretas
            </Button>
          </Surface>
        ) : (
          <Surface style={styles.table} elevation={0}>
            <View style={styles.tableHeader}>
              <Text style={styles.columnLabel}>ICONO Y NOMBRE</Text>
              <Text style={[styles.columnLabel, styles.actionsLabel]}>ACCIONES</Text>
            </View>
            <Divider />
            <FlatList
              data={isLoading ? [] : accounts}
              keyExtractor={(item) => item.id}
              renderItem={renderAccount}
              contentContainerStyle={!isLoading && accounts.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                isLoading ? (
                  <AppLoadingState colors={colors} label="Cargando cuentas" />
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="wallet-plus-outline" size={36} color={colors.mutedText} />
                    <Text style={styles.emptyTitle}>
                      {loadError ? 'No se pudieron cargar las cuentas' : 'Aun no hay cuentas'}
                    </Text>
                    <Text style={styles.emptyText}>
                      {loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Crea una cuenta para organizar saldos, tarjetas o efectivo dentro de esta libreta.'}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={openCreate}
                  buttonColor={colors.primary}
                  textColor={colors.onPrimary}
                  style={styles.createButton}
                  contentStyle={styles.createButtonContent}
                >
                  Nueva cuenta
                </Button>
              }
            />
          </Surface>
        )}
        </View>
      </SafeAreaView>

      <Portal>
        <Dialog
          visible={Boolean(infoAccount)}
          onDismiss={() => setInfoAccount(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Informacion</Dialog.Title>
          <Dialog.Content>
            {infoAccount ? (
              <View style={styles.infoList}>
                <InfoLine label="Titulo" value={infoAccount.name} />
                <InfoLine label="Descripcion" value={infoAccount.description || 'Sin descripcion'} />
                <InfoLine label="Tipo" value={formatAccountType(infoAccount.type)} />
                <InfoLine label="Creacion" value={formatDate(infoAccount.createdAt)} />
                <InfoLine label="Actualizacion" value={formatDate(infoAccount.updatedAt)} />
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInfoAccount(null)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>

        <AccountFormDialog
          colors={colors}
          styles={styles}
          visible={isCreateOpen || Boolean(editingAccount)}
          title={editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}
          values={formValues}
          showNameError={showNameError}
          colorOptions={colorOptions}
          onChange={setFormValues}
          onCancel={closeForm}
          onSave={saveForm}
        />

        <Dialog
          visible={Boolean(deleteAccount)}
          onDismiss={() => setDeleteAccount(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Eliminar cuenta</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Esta accion archivara la cuenta y dejara de mostrarse en el listado.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteAccount(null)}>Cancelar</Button>
            <Button textColor={colors.error} onPress={confirmDelete}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

type AccountFormDialogProps = {
  colors: MeowneyColors;
  styles: ReturnType<typeof createStyles>;
  visible: boolean;
  title: string;
  values: AccountFormValues;
  showNameError: boolean;
  colorOptions: string[];
  onChange: (values: AccountFormValues) => void;
  onCancel: () => void;
  onSave: () => void;
};

function AccountFormDialog({
  colors,
  styles,
  visible,
  title,
  values,
  showNameError,
  colorOptions,
  onChange,
  onCancel,
  onSave,
}: AccountFormDialogProps) {
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const selectedTypeLabel = formatAccountType(values.type);

  return (
    <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Dialog.Title style={styles.dialogTitle}>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.formScrollArea}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <TextInput
                mode="outlined"
                label="Nombre"
                value={values.name}
                onChangeText={(name) => onChange({ ...values, name })}
                error={showNameError}
              />
              {showNameError ? (
                <HelperText type="error" visible>
                  El nombre es obligatorio.
                </HelperText>
              ) : null}
            </View>

            <TextInput
              mode="outlined"
              label="Descripcion"
              value={values.description}
              multiline
              numberOfLines={3}
              onChangeText={(description) => onChange({ ...values, description })}
            />

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>TIPO</Text>
              <Menu
                visible={isTypeMenuOpen}
                onDismiss={() => setIsTypeMenuOpen(false)}
                contentStyle={styles.typeMenuContent}
                anchor={
                  <Button
                    mode="outlined"
                    icon="chevron-down"
                    onPress={() => setIsTypeMenuOpen(true)}
                    style={styles.typeSelect}
                    contentStyle={styles.typeSelectContent}
                    textColor={colors.text}
                  >
                    {selectedTypeLabel}
                  </Button>
                }
              >
                {accountTypeOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    title={option.label}
                    onPress={() => {
                      onChange({ ...values, type: option.value });
                      setIsTypeMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>ICONO</Text>
              <View style={styles.choiceGrid}>
                {iconOptions.map((icon) => {
                  const selected = values.icon === icon;
                  return (
                    <IconButton
                      key={icon}
                      icon={icon}
                      size={22}
                      mode="contained-tonal"
                      iconColor={selected ? colors.onPrimary : colors.text}
                      containerColor={selected ? colors.primary : colors.selected}
                      style={styles.iconChoice}
                      onPress={() => onChange({ ...values, icon })}
                      accessibilityLabel={`Icono ${icon}`}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>COLOR</Text>
              <View style={styles.swatchTray}>
                {colorOptions.map((color) => {
                  const selected = values.color === color;
                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${color}`}
                      onPress={() => onChange({ ...values, color })}
                      style={[
                        styles.colorChoice,
                        { backgroundColor: color },
                        selected && styles.colorChoiceSelected,
                      ]}
                    >
                      {selected ? (
                        <MaterialCommunityIcons name="check" size={18} color={colors.void} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancelar</Button>
          <Button onPress={onSave}>Guardar</Button>
        </Dialog.Actions>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: typography.bodySize,
    lineHeight: 24,
  },
});

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
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.background,
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
      lineHeight: 38,
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
    actionsLabel: {
      minWidth: 104,
      textAlign: 'center',
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    emptyContent: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    row: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
    accountIdentity: {
      minHeight: 72,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.ms,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
    },
    accountIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.input,
    },
    nameCopy: {
      flex: 1,
      minWidth: 0,
    },
    accountName: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    actions: {
      width: 104,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-end',
      paddingRight: spacing.xs,
    },
    actionButton: {
      width: 32,
      height: 32,
      margin: 0,
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
    emptyText: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 22,
      textAlign: 'center',
    },
    createButton: {
      marginTop: spacing.md,
      borderRadius: radii.button,
    },
    createButtonContent: {
      minHeight: 48,
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
    formScrollArea: {
      borderColor: colors.border,
      paddingHorizontal: 0,
    },
    form: {
      gap: spacing.ms,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    fieldGroup: {
      gap: 0,
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
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'space-between',
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
    iconChoice: {
      width: 40,
      height: 40,
      margin: 0,
    },
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
    colorChoiceSelected: {
      borderWidth: 2,
      borderColor: colors.text,
    },
  });
}
