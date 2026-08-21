import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
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
import { AppCatFab } from '@/components/ui/AppCatFab';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppColorPicker, AppDescriptionInput, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
import { AppMeowneySnackbar } from '@/components/ui/AppMeowneySnackbar';
import { AppSelectMenu } from '@/components/ui/AppSelectMenu';
import {
  ACCOUNT_ICON_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  getAccountColorOptions,
  type AccountIconName,
} from '@/constants/accounts';
import { accountRepository, type AccountInput } from '@/database/repositories/account.repository';
import { notebookRepository } from '@/database/repositories/notebook.repository';
import { useDeferredQuery } from '@/hooks/useDeferredQuery';
import { useAppStore } from '@/stores/app.store';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDateTime } from '@/utils/dateFormat';
import type { Account, AccountType } from './types';

type AccountFormValues = {
  name: string;
  description: string;
  type: AccountType;
  icon: AccountIconName;
  color: string;
};

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
  return formatAppDateTime(value);
}

function formatAccountType(type: AccountType) {
  return ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Otro';
}

export function AccountsScreen() {
  const { notebookId } = useLocalSearchParams<{ notebookId?: string }>();
  const routeNotebookId = Array.isArray(notebookId) ? notebookId[0] : notebookId;
  const selectedNotebookId = useAppStore((state) => state.selectedNotebookId);
  const selectedNotebookName = useAppStore((state) => state.selectedNotebookName);
  const setSelectedNotebookId = useAppStore((state) => state.setSelectedNotebookId);
  const activeNotebookId = selectedNotebookId ?? routeNotebookId;
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const colorOptions = useMemo(() => getAccountColorOptions(colors), [colors]);
  const stableNotebookName = useMemo(() => {
    if (selectedNotebookName) {
      return selectedNotebookName;
    }

    return activeNotebookId ? notebookRepository.getActiveById(activeNotebookId)?.name ?? null : null;
  }, [activeNotebookId, selectedNotebookName]);

  const loadAccountsData = useCallback(() => {
    if (!activeNotebookId) {
      return { accounts: [], notebookName: stableNotebookName };
    }

    return {
      accounts: accountRepository.listActiveByNotebook(activeNotebookId),
      notebookName: stableNotebookName,
    };
  }, [activeNotebookId, stableNotebookName]);
  const {
    data: accountsData,
    error: loadError,
    isLoading,
    reload: reloadAccounts,
  } = useDeferredQuery(loadAccountsData, { accounts: [], notebookName: stableNotebookName });
  const { accounts, notebookName: activeNotebookName } = accountsData;
  const [infoAccount, setInfoAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [actionMenuAccountId, setActionMenuAccountId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => getInitialForm(colors));
  const [showNameError, setShowNameError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (routeNotebookId && routeNotebookId !== selectedNotebookId) {
      setSelectedNotebookId(routeNotebookId, notebookRepository.getActiveById(routeNotebookId)?.name ?? null);
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
      setSnackbarMessage('Cuenta actualizada; Meowney ya ajusto el saldo vigilado.');
    } else {
      accountRepository.create(toInput(activeNotebookId, formValues));
      setSnackbarMessage('Cuenta agregada a la guarida.');
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
    setSnackbarMessage('Cuenta archivada fuera de la guarida.');
    reloadAccounts();
  };

  const renderAccount = ({ item }: { item: Account }) => {
    const iconName = (item.icon as AccountIconName | null) ?? 'wallet-outline';
    const color = item.color ?? colors.cyanSignal;

    return (
      <Surface style={styles.accountRow} elevation={0}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver cuenta"
          onPress={() => setInfoAccount(item)}
          style={({ pressed }) => [styles.accountContent, pressed && styles.accountPressed]}
        >
          <View style={[styles.accountIconWrap, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={colors.void} />
          </View>
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.accountName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.accountMeta}>
              {formatAccountType(item.type)}
            </Text>
          </View>
        </Pressable>

        <AppActionMenu
          visible={actionMenuAccountId === item.id}
          onDismiss={() => setActionMenuAccountId(null)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              accessibilityLabel="Acciones de la cuenta"
              icon="dots-vertical"
              iconColor={colors.mutedText}
              size={18}
              style={styles.accountActionsButton}
              onPress={() => setActionMenuAccountId(item.id)}
            />
          }
        >
          <Menu.Item
            leadingIcon="information-outline"
            title="Ver"
            onPress={() => {
              setActionMenuAccountId(null);
              setInfoAccount(item);
            }}
          />
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Editar"
            onPress={() => {
              setActionMenuAccountId(null);
              openEdit(item);
            }}
          />
          <Menu.Item
            leadingIcon="trash-can-outline"
            title="Eliminar"
            onPress={() => {
              setActionMenuAccountId(null);
              setDeleteAccount(item);
            }}
          />
        </AppActionMenu>
      </Surface>
    );
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={activeNotebookName ?? stableNotebookName ?? 'Meowney'}
        left={
          <AppHeaderActionButton
            accessibilityLabel="Regresar a Mi libreta"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen
        eyebrow="CUENTAS"
        title="Saldos vigilados"
        helpTitle="Para que sirven las cuentas?"
        helpMessage="Las cuentas son los lugares donde vive tu dinero: efectivo, banco, tarjeta, ahorro o wallet. Meowney las vigila para que cada movimiento tenga de donde entrar o salir."
      >
        {!activeNotebookId ? (
          <AppEmptyState
            icon="book-alert-outline"
            title="Selecciona una libreta"
            message="Entra primero a una guarida para que Meowney sepa donde cuidar tus cuentas."
            style={styles.missingNotebook}
            action={
            <Button mode="contained" onPress={() => router.replace('/notebooks')}>
              Ir a libretas
            </Button>
            }
          />
        ) : (
          <>
            <FlatList
              style={styles.list}
              data={isLoading ? [] : accounts}
              keyExtractor={(item) => item.id}
              renderItem={renderAccount}
              contentContainerStyle={!isLoading && accounts.length ? styles.listContent : styles.emptyContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                isLoading ? (
                  <AppLoadingState colors={colors} label="Cargando cuentas" />
                ) : (
                  <AppEmptyState
                    icon="wallet-plus-outline"
                    title={loadError ? 'No se pudieron cargar las cuentas' : 'Aun no hay saldos que vigilar'}
                    message={
                      loadError
                        ? 'Intenta entrar de nuevo o revisa que la base de datos este disponible.'
                        : 'Aqui apareceran tus bancos, efectivo, tarjetas o wallets. Agrega una cuenta para que cada ingreso o gasto tenga de donde entrar o salir.'
                    }
                    style={styles.emptyState}
                  />
                )
              }
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.bottomAction}>
              <AppCatFab
                accessibilityLabel="Agregar cuenta"
                label="Agregar cuenta"
                style={styles.addButton}
                onPress={openCreate}
              />
            </View>
          </>
        )}
      </AppScreen>

      <Portal>
        <AppContentDialog
          visible={Boolean(infoAccount)}
          title="Detalle"
          titleIcon="information-outline"
          titleIconColor={colors.text}
          contentContainerStyle={styles.infoDialogContent}
          onAction={() => setInfoAccount(null)}
          onDismiss={() => setInfoAccount(null)}
        >
          {infoAccount ? (
            <>
              <AppInfoLine label="Titulo" value={infoAccount.name} />
              <AppInfoLine label="Descripcion" value={infoAccount.description || 'Sin descripcion'} />
              <AppInfoLine label="Tipo" value={formatAccountType(infoAccount.type)} />
              <AppInfoLine label="Creacion" value={formatDate(infoAccount.createdAt)} />
              <AppInfoLine label="Actualizacion" value={formatDate(infoAccount.updatedAt)} />
            </>
          ) : null}
        </AppContentDialog>

        <AccountFormDialog
          styles={styles}
          visible={isCreateOpen || Boolean(editingAccount)}
          title={editingAccount ? 'Editar cuenta' : 'Agregar cuenta'}
          values={formValues}
          showNameError={showNameError}
          colorOptions={colorOptions}
          onChange={setFormValues}
          onCancel={closeForm}
          onSave={saveForm}
        />

        <AppConfirmDialog
          visible={Boolean(deleteAccount)}
          title="Eliminar cuenta"
          message="Esta accion archivara la cuenta y dejara de mostrarse en el listado."
          onCancel={() => setDeleteAccount(null)}
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

type AccountFormDialogProps = {
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
  const formScrollRef = useRef<ScrollView>(null);
  const selectedTypeLabel = formatAccountType(values.type);

  return (
    <AppFormDialog
      visible={visible}
      title={title}
      contentContainerStyle={styles.form}
      scrollRef={formScrollRef}
      titleIcon={values.icon}
      titleIconColor={values.color}
      onCancel={onCancel}
      onSave={onSave}
    >
      <View style={styles.fieldGroup}>
        <Text style={styles.pickerLabel}>NOMBRE</Text>
        <TextInput
          mode="outlined"
          placeholder="Ej. Banco principal, Efectivo o Tarjeta"
          value={values.name}
          onChangeText={(name) => onChange({ ...values, name })}
          error={showNameError}
        />
        {showNameError ? (
          <HelperText type="error" visible>
            Escribe un nombre para reconocer esta cuenta.
          </HelperText>
        ) : null}
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <AppDescriptionInput
          placeholder="Ej. Dinero para pagos diarios"
          scrollRef={formScrollRef}
          value={values.description}
          onChangeText={(description) => onChange({ ...values, description })}
        />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>TIPO</Text>
        <AppSelectMenu
          icon="chevron-down"
          label="Tipo"
          options={ACCOUNT_TYPE_OPTIONS}
          selectedLabel={selectedTypeLabel}
          selectedValue={values.type}
          buttonStyle={styles.typeSelect}
          buttonContentStyle={styles.typeSelectContent}
          menuContentStyle={styles.typeMenuContent}
          onSelect={(type) => onChange({ ...values, type })}
        />
      </View>

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>ICONO</Text>
        <AppIconPickerGrid
          columns={5}
          icons={ACCOUNT_ICON_OPTIONS}
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
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    emptyContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    accountRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.pressed,
      borderRadius: radii.input,
      backgroundColor: colors.background,
    },
    accountContent: {
      flex: 1,
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    accountPressed: {
      backgroundColor: colors.selected,
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
      gap: 3,
    },
    accountName: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    accountMeta: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
    accountActionsButton: {
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
      marginHorizontal: -spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    addButton: {
      width: '70%',
    },
    menuContent: {
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
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
    fieldGroup: {
      gap: spacing.sm,
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
  });
}



