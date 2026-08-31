import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { AppScreen } from '@/components/layout/AppScreen';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { getMeowneyColors, type MeowneyColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type MyNotebookIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type MyNotebookItem = {
  description: string;
  href: Href<string | object>;
  icon: MyNotebookIconName;
  label: string;
};

export function MyNotebookScreen() {
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigationLockedRef = useRef(false);

  const navigateOnce = useCallback((href: Href<string | object>) => {
    if (navigationLockedRef.current) {
      return;
    }

    navigationLockedRef.current = true;
    router.push(href);

    setTimeout(() => {
      navigationLockedRef.current = false;
    }, motion.screenTransitionDuration + 300);
  }, []);

  const setupItems: MyNotebookItem[] = [
    {
      description: 'Tu dinero diario',
      href: '/accounts',
      icon: 'wallet-outline',
      label: 'Cuentas',
    },
    {
      description: 'Orden para movimientos',
      href: '/categories',
      icon: 'tag-outline',
      label: 'Categorías',
    },
  ];

  const controlItems: MyNotebookItem[] = [
    {
      description: 'Límites de gasto',
      href: '/budgets',
      icon: 'cash-lock',
      label: 'Presupuestos',
    },
    {
      description: 'Pagos recurrentes',
      href: '/subscriptions',
      icon: 'calendar-sync-outline',
      label: 'Suscripciones',
    },
  ];

  return (
    <AppScreen
      eyebrow="MI LIBRETA"
      helpTitle="¿Para qué sirve Mi libreta?"
      helpMessage="Aquí está el centro de control de esta libreta. Desde este punto Meowney te deja abrir cuentas, categorías, presupuestos y otros cuidados para mantener tus finanzas separadas y bien vigiladas."
      scroll
    >
      <MyNotebookSection
        items={setupItems}
        label="PARA EMPEZAR"
        styles={styles}
        colors={colors}
        onNavigate={navigateOnce}
      />
      <MyNotebookSection
        items={controlItems}
        label="CONTROL"
        styles={styles}
        colors={colors}
        onNavigate={navigateOnce}
      />
    </AppScreen>
  );
}

type MyNotebookSectionProps = {
  colors: MeowneyColors;
  items: MyNotebookItem[];
  label: string;
  onNavigate: (href: Href<string | object>) => void;
  styles: ReturnType<typeof createStyles>;
};

function MyNotebookSection({
  colors,
  items,
  label,
  onNavigate,
  styles,
}: MyNotebookSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Surface style={styles.sectionSurface} elevation={0}>
        {items.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={() => onNavigate(item.href)}
            style={({ pressed }) => [
              styles.item,
              index > 0 && styles.itemBorder,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={styles.itemIcon}>
              <MaterialCommunityIcons
                name={item.icon}
                size={21}
                color={colors.text}
              />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{item.label}</Text>
              <Text numberOfLines={1} style={styles.itemDescription}>
                {item.description}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.mutedText}
            />
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
