import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text as NativeText, View, type DimensionValue } from 'react-native';
import { Checkbox, IconButton, TextInput } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const CUSTOM_COLOR_SATURATION = 0.84;
const MIN_CUSTOM_COLOR_VALUE = 0.24;
const HUE_STOPS = [0, 30, 60, 90, 120, 160, 190, 220, 250, 280, 310, 340, 360];

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
  const normalizedSelectedColor = normalizeHexColor(selectedColor);
  const defaultColors = colorOptions
    .map((color) => normalizeHexColor(color))
    .filter((color): color is string => Boolean(color));
  const selectedHsv = hexToHsv(normalizedSelectedColor ?? colorOptions[0] ?? colors.irisGleam);
  const [customHue, setCustomHue] = useState(selectedHsv.h);
  const [customValue, setCustomValue] = useState(selectedHsv.v);
  const customColor = hsvToHex(customHue, CUSTOM_COLOR_SATURATION, customValue);
  const intensityStops = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) =>
        hsvToHex(
          customHue,
          CUSTOM_COLOR_SATURATION,
          MIN_CUSTOM_COLOR_VALUE + ((1 - MIN_CUSTOM_COLOR_VALUE) * index) / 7,
        ),
      ),
    [customHue],
  );

  useEffect(() => {
    setCustomHue(selectedHsv.h);
    setCustomValue(Math.max(MIN_CUSTOM_COLOR_VALUE, selectedHsv.v));
  }, [selectedHsv.h, selectedHsv.v]);

  const updateCustomColor = (nextHue: number, nextValue: number) => {
    setCustomHue(nextHue);
    setCustomValue(nextValue);
    onSelect(hsvToHex(nextHue, CUSTOM_COLOR_SATURATION, nextValue));
  };

  return (
    <View style={styles.colorPickerWrap}>
      <View style={[styles.swatchTray, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        {defaultColors.map((normalizedColor) => {
          const selected = normalizedSelectedColor === normalizedColor;

          return (
            <View key={normalizedColor} style={styles.colorChoiceCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Color ${normalizedColor}`}
                onPress={() => onSelect(normalizedColor)}
                style={[
                  styles.colorChoice,
                  { backgroundColor: normalizedColor, borderColor: selected ? colors.text : colors.border },
                  selected && styles.colorChoiceSelected,
                ]}
              >
                {selected ? <MaterialCommunityIcons name="check" size={18} color={getReadableSwatchIconColor(normalizedColor, colors)} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={[styles.customColorPanel, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.customColorHeader}>
          <View style={[styles.customColorPreview, { backgroundColor: customColor, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="check" size={18} color={getReadableSwatchIconColor(customColor, colors)} />
          </View>
          <View style={styles.customColorCopy}>
            <NativeText style={[styles.customColorLabel, { color: colors.mutedText }]}>COLOR PERSONALIZADO</NativeText>
            <NativeText style={[styles.customColorValue, { color: colors.text }]}>{customColor}</NativeText>
          </View>
        </View>
        <ColorRangeControl
          label="Color"
          value={customHue / 360}
          stops={HUE_STOPS.map((hue) => hsvToHex(hue, CUSTOM_COLOR_SATURATION, customValue))}
          colors={colors}
          onChange={(value) => updateCustomColor(Math.round(value * 360), customValue)}
        />
        <ColorRangeControl
          label="Intensidad"
          value={(customValue - MIN_CUSTOM_COLOR_VALUE) / (1 - MIN_CUSTOM_COLOR_VALUE)}
          stops={intensityStops}
          colors={colors}
          onChange={(value) =>
            updateCustomColor(
              customHue,
              MIN_CUSTOM_COLOR_VALUE + value * (1 - MIN_CUSTOM_COLOR_VALUE),
            )
          }
        />
      </View>
    </View>
  );
}

type ColorRangeControlProps = {
  colors: MeowneyColors;
  label: string;
  stops: string[];
  value: number;
  onChange: (value: number) => void;
};

function ColorRangeControl({ colors, label, stops, value, onChange }: ColorRangeControlProps) {
  const [trackWidth, setTrackWidth] = useState(1);
  const trackPageX = useRef(0);
  const trackRef = useRef<View | null>(null);
  const clampedValue = clamp01(value);
  const updateFromPageX = (pageX: number) => {
    onChange(clamp01((pageX - trackPageX.current) / trackWidth));
  };
  const measureTrack = (afterMeasure?: () => void) => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackWidth(Math.max(1, width));
      trackPageX.current = pageX;
      afterMeasure?.();
    });
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { pageX } = event.nativeEvent;
          measureTrack(() => updateFromPageX(pageX));
        },
        onPanResponderMove: (_event, gestureState) => {
          updateFromPageX(gestureState.moveX);
        },
      }),
    [onChange, trackWidth],
  );

  return (
    <View style={styles.colorRange}>
      <NativeText style={[styles.colorRangeLabel, { color: colors.mutedText }]}>{label}</NativeText>
      <View
        ref={trackRef}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        onLayout={(event) => {
          setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
          requestAnimationFrame(() => measureTrack());
        }}
        style={[styles.colorRangeTrack, { borderColor: colors.border }]}
      >
        {stops.map((stop, index) => (
          <View
            key={`${stop}_${index}`}
            pointerEvents="none"
            style={[
              styles.colorRangeStop,
              { backgroundColor: stop },
              index === 0 ? styles.colorRangeStopFirst : null,
              index === stops.length - 1 ? styles.colorRangeStopLast : null,
            ]}
          />
        ))}
        <View
          pointerEvents="none"
          style={[
            styles.colorRangeThumb,
            {
              borderColor: colors.text,
              left: `${clampedValue * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function normalizeHexColor(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  if (/^#[0-9A-Fa-f]{3}$/.test(withHash)) {
    const [, red, green, blue] = withHash;
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) {
    return withHash.toUpperCase();
  }

  return null;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const normalizedHue = (((hue % 360) + 360) % 360) / 60;
  const chroma = value * saturation;
  const secondary = chroma * (1 - Math.abs((normalizedHue % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (normalizedHue >= 0 && normalizedHue < 1) {
    red = chroma;
    green = secondary;
  } else if (normalizedHue >= 1 && normalizedHue < 2) {
    red = secondary;
    green = chroma;
  } else if (normalizedHue >= 2 && normalizedHue < 3) {
    green = chroma;
    blue = secondary;
  } else if (normalizedHue >= 3 && normalizedHue < 4) {
    green = secondary;
    blue = chroma;
  } else if (normalizedHue >= 4 && normalizedHue < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return `#${toHexChannel(red + match)}${toHexChannel(green + match)}${toHexChannel(blue + match)}`;
}

function hexToHsv(color: string) {
  const normalizedColor = normalizeHexColor(color) ?? '#847DFF';
  const red = Number.parseInt(normalizedColor.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalizedColor.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalizedColor.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    h: Math.round((hue + 360) % 360),
    v: Math.max(MIN_CUSTOM_COLOR_VALUE, max),
  };
}

function toHexChannel(value: number) {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

function getReadableSwatchIconColor(color: string | null, colors: MeowneyColors) {
  if (!color) {
    return colors.text;
  }

  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) {
    return colors.text;
  }

  const red = Number.parseInt(normalizedColor.slice(1, 3), 16);
  const green = Number.parseInt(normalizedColor.slice(3, 5), 16);
  const blue = Number.parseInt(normalizedColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? colors.void : colors.pure;
}

export function AppOptionToggle({
  checked,
  checkedLabel,
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
        pressed && { backgroundColor: colors.pressed },
      ]}
    >
      <Checkbox.Android
        status={checked ? 'checked' : 'unchecked'}
        color={colors.primary}
        uncheckedColor={colors.mutedText}
      />
      <NativeText numberOfLines={1} style={[styles.optionToggleText, { color: colors.text }]}>
        {checked ? checkedLabel : uncheckedLabel}
      </NativeText>
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
  colorPickerWrap: {
    gap: spacing.sm,
  },
  swatchTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  colorChoiceCell: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
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
  customColorPanel: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  customColorHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customColorPreview: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.input,
  },
  customColorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  customColorLabel: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
  },
  customColorValue: {
    fontSize: typography.bodySmallSize,
    fontWeight: typography.mediumWeight,
    lineHeight: 20,
  },
  colorRange: {
    gap: spacing.xs,
  },
  colorRangeLabel: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  colorRangeTrack: {
    height: 34,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderRadius: radii.input,
  },
  colorRangeStop: {
    flex: 1,
  },
  colorRangeStopFirst: {
    borderTopLeftRadius: radii.input,
    borderBottomLeftRadius: radii.input,
  },
  colorRangeStopLast: {
    borderTopRightRadius: radii.input,
    borderBottomRightRadius: radii.input,
  },
  colorRangeThumb: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 36,
    marginLeft: -6,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  optionToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.input,
    paddingRight: spacing.sm,
  },
  optionToggleText: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.bodySize,
    fontWeight: typography.mediumWeight,
    lineHeight: 22,
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


