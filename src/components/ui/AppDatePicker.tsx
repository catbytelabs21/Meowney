import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { Button, Dialog, IconButton, Switch, Text, TextInput } from 'react-native-paper';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { formatAppDate } from '@/utils/dateFormat';

type DatePickerView = 'calendar' | 'list';

type AppDateInputProps = {
  label?: string;
  value: string;
  onOpen: () => void;
};

type AppDatePickerDialogProps = {
  selectedDate: string;
  today: string;
  visible: boolean;
  onDismiss: () => void;
  onSelect: (dateKey: string) => void;
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCompactDate(dateKey: string) {
  return formatAppDate(dateKey);
}

export function formatLongDate(dateKey: string) {
  return formatAppDate(dateKey);
}

function createMonthDateKeys(monthDate: Date) {
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const days: (string | null)[] = Array.from(
    { length: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)));
  }

  return days;
}

function createMonthListDateKeys(monthDate: Date) {
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const days: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)));
  }

  return days;
}

function formatMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function AppDateInput({ label = 'Fecha', value, onOpen }: AppDateInputProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={formatCompactDate(value)}
      editable={false}
      onPressIn={onOpen}
      right={<TextInput.Icon icon="calendar-month-outline" onPress={onOpen} />}
      style={[styles.dateInput, { backgroundColor: colors.background }]}
    />
  );
}

export function AppDatePickerDialog({
  selectedDate,
  today,
  visible,
  onDismiss,
  onSelect,
}: AppDatePickerDialogProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const [view, setView] = useState<DatePickerView>('calendar');
  const [monthDate, setMonthDate] = useState(() => new Date(`${selectedDate}T12:00:00`));
  const dateKeys = useMemo(() => createMonthDateKeys(monthDate), [monthDate]);
  const listDateKeys = useMemo(() => createMonthListDateKeys(monthDate), [monthDate]);

  useEffect(() => {
    if (visible) {
      setMonthDate(new Date(`${selectedDate}T12:00:00`));
    }
  }, [selectedDate, visible]);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, { backgroundColor: colors.surface }]}>
      <Dialog.Title style={[styles.dialogTitle, { color: colors.text }]}>Seleccionar fecha</Dialog.Title>
      <Dialog.Content>
        <View style={styles.datePickerHeader}>
          <Text style={[styles.pickerLabel, { color: colors.mutedText }]}>{view === 'calendar' ? 'CALENDARIO' : 'LISTADO'}</Text>
          <View style={styles.switchInline}>
            <MaterialCommunityIcons name="format-list-bulleted" size={18} color={colors.mutedText} />
            <Switch value={view === 'calendar'} onValueChange={(isCalendar) => setView(isCalendar ? 'calendar' : 'list')} />
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.mutedText} />
          </View>
        </View>

        {view === 'calendar' ? (
          <View style={[styles.datePickerSurface, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <MonthHeader colors={colors} monthDate={monthDate} onChangeMonth={setMonthDate} />
            <View style={styles.weekRow}>
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                <Text key={`${day}_${index}`} style={[styles.weekLabel, { color: colors.mutedText }]}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {dateKeys.map((dateKey, index) =>
                dateKey ? (
                  <Pressable
                    key={dateKey}
                    accessibilityRole="button"
                    onPress={() => onSelect(dateKey)}
                    style={({ pressed }) => [styles.calendarDay, pressed && { backgroundColor: colors.pressed }]}
                  >
                    <View
                      style={[
                        styles.calendarDayContent,
                        dateKey === selectedDate && { backgroundColor: colors.selected },
                        dateKey === today && { borderWidth: 1, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { color: colors.text },
                          dateKey === today && { color: colors.primary, fontWeight: typography.mediumWeight },
                        ]}
                      >
                        {Number(dateKey.slice(-2))}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View key={`empty_${index}`} style={styles.calendarDay} />
                ),
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.datePickerSurface, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <MonthHeader colors={colors} monthDate={monthDate} onChangeMonth={setMonthDate} />
            <ScrollView style={styles.dateList} contentContainerStyle={styles.dateListContent}>
              {listDateKeys.map((dateKey) => (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  onPress={() => onSelect(dateKey)}
                  style={({ pressed }) => [
                    styles.dateRow,
                    { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    dateKey === selectedDate && { backgroundColor: colors.selected },
                    dateKey === today && { borderColor: colors.primary },
                    pressed && { backgroundColor: colors.pressed },
                  ]}
                >
                  <View style={styles.dateRowCopy}>
                    <Text style={[styles.dateRowTitle, { color: colors.text }]}>{formatLongDate(dateKey)}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mutedText} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cerrar</Button>
      </Dialog.Actions>
    </Dialog>
  );
}

type MonthHeaderProps = {
  colors: MeowneyColors;
  monthDate: Date;
  onChangeMonth: (date: Date) => void;
};

function MonthHeader({ colors, monthDate, onChangeMonth }: MonthHeaderProps) {
  return (
    <View style={styles.monthHeader}>
      <IconButton
        icon="chevron-left"
        size={20}
        iconColor={colors.text}
        onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
        style={styles.monthButton}
      />
      <Text style={[styles.monthTitle, { color: colors.text }]}>{formatMonthLabel(monthDate)}</Text>
      <IconButton
        icon="chevron-right"
        size={20}
        iconColor={colors.text}
        onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
        style={styles.monthButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateInput: {
    flex: 1,
    minWidth: 0,
  },
  dialog: {
    borderRadius: radii.card,
  },
  dialogTitle: {
    fontWeight: typography.bodyWeight,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
  },
  switchInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  datePickerSurface: {
    overflow: 'hidden',
    height: 372,
    borderWidth: 1,
    borderRadius: radii.card,
  },
  monthHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  monthButton: {
    margin: 0,
  },
  monthTitle: {
    fontSize: typography.bodySize,
    fontWeight: typography.bodyWeight,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  weekLabel: {
    flex: 1,
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: radii.input,
  },
  calendarDayContent: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.input,
  },
  calendarDayText: {
    fontSize: typography.bodySmallSize,
    fontWeight: typography.bodyWeight,
  },
  dateList: {
    flex: 1,
  },
  dateListContent: {
    gap: spacing.sm,
  },
  dateRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.input,
  },
  dateRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  dateRowTitle: {
    fontSize: typography.bodySize,
    fontWeight: typography.bodyWeight,
  },
});
