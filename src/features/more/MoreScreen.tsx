import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppScreen } from '@/components/layout/AppScreen';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type MoreIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type MoreItem = {
  description: string;
  icon: MoreIconName;
  label: string;
  onPress: () => void;
};

export function MoreScreen() {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const managementItems: MoreItem[] = [
    {
      description: 'Saldos que Meowney vigila',
      icon: 'wallet-outline',
      label: 'Cuentas',
      onPress: () => router.push('/accounts'),
    },
    {
      description: 'Etiquetas para seguir rastros',
      icon: 'tag-outline',
      label: 'Categorias',
      onPress: () => router.push('/categories'),
    },
    {
      description: 'Limites para no gastar con garra',
      icon: 'chart-donut',
      label: 'Presupuestos',
      onPress: () => router.push('/budgets'),
    },
  ];

  return (
    <AppScreen eyebrow="MAS" title="Herramientas" scroll>
      <MoreSection items={managementItems} label="RINCON DE CONTROL" styles={styles} colors={colors} />
    </AppScreen>
  );
}

type MoreSectionProps = {
  colors: MeowneyColors;
  items: MoreItem[];
  label: string;
  styles: ReturnType<typeof createStyles>;
};

function MoreSection({ colors, items, label, styles }: MoreSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Surface style={styles.sectionSurface} elevation={0}>
        {items.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.item,
              index > 0 && styles.itemBorder,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={styles.itemIcon}>
              <MaterialCommunityIcons name={item.icon} size={21} color={colors.text} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{item.label}</Text>
              <Text numberOfLines={1} style={styles.itemDescription}>
                {item.description}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mutedText} />
          </Pressable>
        ))}
      </Surface>
    </View>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      color: colors.mutedText,
      fontSize: typography.monoLabelSize,
      fontWeight: typography.mediumWeight,
      letterSpacing: 0.2,
    },
    sectionSurface: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surface,
    },
    item: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    itemBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemPressed: {
      backgroundColor: colors.pressed,
    },
    itemIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.navItem,
      backgroundColor: colors.selected,
    },
    itemCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    itemTitle: {
      color: colors.text,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
    },
    itemDescription: {
      color: colors.mutedText,
      fontSize: typography.bodySmallSize,
      lineHeight: 20,
    },
  });
}


