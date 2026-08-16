import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View, type DimensionValue } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type AppInfoLineProps = {
  label: string;
  value: string;
};

type AppDescriptionInputProps = {
  placeholder: string;
  scrollRef?: RefObject<ScrollView | null>;
  value: string;
  onChangeText: (value: string) => void;
};

type AppIconPickerGridProps<IconName extends AppIconName> = {
  columns?: number;
  icons: IconName[];
  selectedIcon: IconName;
  onSelect: (icon: IconName) => void;
};

type AppColorPickerProps = {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
};

type AppOptionToggleProps = {
  checked: boolean;
  checkedIcon?: AppIconName;
  checkedLabel: string;
  leadingCheckedIcon?: AppIconName;
  leadingUncheckedIcon?: AppIconName;
  uncheckedIcon?: AppIconName;
  uncheckedLabel: string;
  onToggle: () => void;
};

type AppReadOnlyRowProps = {
  icon: AppIconName;
  iconBackgroundColor?: string;
  iconColor?: string;
  subtitle?: string;
  title: string;
  trailingText?: string;
  trailingTextColor?: string;
};

export function AppInfoLine({ label, value }: AppInfoLineProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <View style={styles.infoLine}>
      <NativeText style={[styles.infoLabel, { color: colors.mutedText }]}>{label}</NativeText>
      <NativeText style={[styles.infoValue, { color: colors.text }]}>{value}</NativeText>
    </View>
  );
}

export function AppDescriptionInput({ placeholder, value, onChangeText }: AppDescriptionInputProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <TextInput
      mode="outlined"
      placeholder={placeholder}
      value={value}
      multiline
      numberOfLines={3}
      scrollEnabled={false}
      style={[styles.descriptionInput, { backgroundColor: colors.background }]}
      contentStyle={styles.descriptionInputContent}
      onChangeText={onChangeText}
    />
  );
}

export function AppIconPickerGrid<IconName extends AppIconName>({
  columns = 5,
  icons,
  selectedIcon,
  onSelect,
}: AppIconPickerGridProps<IconName>) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const cellWidth = `${Math.max(1, Math.floor(100 / columns) - 3)}%` as DimensionValue;

  return (
    <View style={styles.choiceGrid}>
      {icons.map((icon) => {
        const selected = selectedIcon === icon;

        return (
          <View key={icon} style={[styles.iconChoiceCell, { width: cellWidth }]}>
            <IconButton
              icon={icon}
              size={22}
              mode="contained-tonal"
              iconColor={selected ? colors.onPrimary : colors.text}
              containerColor={selected ? colors.primary : colors.selected}
              style={styles.iconChoice}
              onPress={() => onSelect(icon)}
              accessibilityLabel={`Icono ${icon}`}
            />
          </View>
        );
      })}
    </View>
  );
}

export function AppColorPicker({ colors: colorOptions, selectedColor, onSelect }: AppColorPickerProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <View style={[styles.swatchTray, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      {colorOptions.map((color) => {
        const selected = selectedColor === color;

        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Color ${color}`}
            onPress={() => onSelect(color)}
            style={[
              styles.colorChoice,
              { backgroundColor: color, borderColor: selected ? colors.text : colors.border },
              selected && styles.colorChoiceSelected,
            ]}
          >
            {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.void} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppOptionToggle({
  checked,
  checkedIcon = 'check-circle-outline',
  checkedLabel,
  leadingCheckedIcon = 'star',
  leadingUncheckedIcon = 'star-outline',
  uncheckedIcon = 'circle-outline',
  uncheckedLabel,
  onToggle,
}: AppOptionToggleProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.optionToggle,
        { borderColor: colors.border, backgroundColor: colors.background },
        checked && { borderColor: colors.pressed, backgroundColor: colors.selected },
        pressed && { backgroundColor: colors.pressed },
      ]}
    >
      <View style={styles.optionToggleIcon}>
        <MaterialCommunityIcons
          name={checked ? leadingCheckedIcon : leadingUncheckedIcon}
          size={20}
          color={checked ? colors.warning : colors.mutedText}
        />
      </View>
      <NativeText numberOfLines={1} style={[styles.optionToggleText, { color: colors.text }]}>
        {checked ? checkedLabel : uncheckedLabel}
      </NativeText>
      <MaterialCommunityIcons
        name={checked ? checkedIcon : uncheckedIcon}
        size={20}
        color={checked ? colors.success : colors.mutedText}
      />
    </Pressable>
  );
}

export function AppReadOnlyRow({
  icon,
  iconBackgroundColor,
  iconColor,
  subtitle,
  title,
  trailingText,
  trailingTextColor,
}: AppReadOnlyRowProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <View style={[styles.readOnlyRow, { borderColor: colors.pressed, backgroundColor: colors.background }]}>
      <View style={styles.readOnlyRowContent}>
        <View style={[styles.readOnlyIcon, { backgroundColor: iconBackgroundColor ?? colors.selected }]}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor ?? colors.void} />
        </View>
        <View style={styles.readOnlyCopy}>
          <NativeText numberOfLines={1} style={[styles.readOnlyTitle, { color: colors.text }]}>
            {title}
          </NativeText>
          {subtitle ? (
            <NativeText numberOfLines={1} style={[styles.readOnlySubtitle, { color: colors.mutedText }]}>
              {subtitle}
            </NativeText>
          ) : null}
        </View>
        {trailingText ? (
          <NativeText numberOfLines={1} style={[styles.readOnlyTrailing, { color: trailingTextColor ?? colors.text }]}>
            {trailingText}
          </NativeText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoLine: {
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.bodySize,
    lineHeight: 22,
  },
  descriptionInput: {
    minHeight: 88,
  },
  descriptionInputContent: {
    minHeight: 88,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconChoiceCell: {
    alignItems: 'center',
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
    borderRadius: radii.card,
    padding: spacing.sm,
  },
  colorChoice: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.input,
    borderWidth: 1,
  },
  colorChoiceSelected: {
    borderWidth: 2,
  },
  optionToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
  },
  optionToggleIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionToggleText: {
    flex: 1,
    fontSize: typography.bodySize,
    fontWeight: typography.bodyWeight,
  },
  readOnlyRow: {
    minHeight: 68,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radii.input,
  },
  readOnlyRowContent: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  readOnlyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.input,
  },
  readOnlyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  readOnlyTitle: {
    fontSize: typography.bodySize,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
  },
  readOnlySubtitle: {
    fontSize: typography.bodySmallSize,
    lineHeight: 20,
  },
  readOnlyTrailing: {
    maxWidth: 124,
    fontSize: typography.bodySize,
    fontWeight: typography.mediumWeight,
    textAlign: 'right',
  },
});


