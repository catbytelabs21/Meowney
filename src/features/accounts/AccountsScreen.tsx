import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
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
import { AppHeader } from '@/components/layout/AppHeader';
import { AppHeaderActionButton } from '@/components/layout/AppHeaderActionButton';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppActionMenu } from '@/components/ui/AppActionMenu';
import { AppDescriptionInput, AppIconPickerGrid, AppInfoLine } from '@/components/ui/AppFormFields';
import { AppConfirmDialog, AppContentDialog, AppFormDialog } from '@/components/ui/AppFormDialog';
import { AppLoadingState } from '@/components/ui/AppLoadingState';
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
  { label: 'Ahorro', value: 'SAVINGS' },
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
  return formatAppDateTime(value);
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
            leadingIcon="eye-outline"
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
            accessibilityLabel="Regresar a mas"
            icon="arrow-left"
            onPress={() => router.back()}
          />
        }
      />
      <AppScreen eyebrow="CUENTAS" title="Activos y tarjetas">
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
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.fabWrap} pointerEvents="box-none">
              <IconButton
                accessibilityLabel="Nueva cuenta"
                icon="plus"
                mode="contained"
                iconColor={colors.onPrimary}
                containerColor={colors.primary}
                size={28}
                style={styles.fab}
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
          titleIcon="eye-outline"
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

        <AppConfirmDialog
          visible={Boolean(deleteAccount)}
          title="Eliminar cuenta"
          message="Esta accion archivara la cuenta y dejara de mostrarse en el listado."
          onCancel={() => setDeleteAccount(null)}
          onConfirm={confirmDelete}
        />
      </Portal>
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
  const formScrollRef = useRef<ScrollView>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
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
          placeholder="Ej. Tarjeta principal"
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

      <View style={styles.pickerGroup}>
        <Text style={styles.pickerLabel}>DESCRIPCION</Text>
        <AppDescriptionInput
          placeholder="Ej. Cuenta para pagos diarios"
          scrollRef={formScrollRef}
          value={values.description}
          onChangeText={(description) => onChange({ ...values, description })}
        />
      </View>

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
        <AppIconPickerGrid
          columns={5}
          icons={iconOptions}
          selectedIcon={values.icon}
          onSelect={(icon) => onChange({ ...values, icon })}
        />
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
                {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.void} /> : null}
              </Pressable>
            );
          })}
        </View>
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
      lineHeight: typography.headingLineHeight,
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
      margin: 0,
      opacity: 0.72,
      borderRadius: 28,
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
