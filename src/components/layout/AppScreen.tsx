import type { ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppScreenHeaderProps = {
  eyebrow: string;
  subtitle?: string;
  title: string;
  style?: StyleProp<ViewStyle>;
  withBottomGap?: boolean;
};

type AppScreenProps = AppScreenHeaderProps & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
};

type MeowneyMarkerIcon = keyof typeof MaterialCommunityIcons.glyphMap;

function getMeowneyMarkerIcon(eyebrow: string): MeowneyMarkerIcon {
  const normalizedEyebrow = eyebrow.toUpperCase();

  if (normalizedEyebrow.includes('LIBRETA')) {
    return 'notebook-outline';
  }

  if (normalizedEyebrow.includes('BALANCE')) {
    return 'scale-balance';
  }

  if (normalizedEyebrow.includes('CUENTA')) {
    return 'wallet-outline';
  }

  if (normalizedEyebrow.includes('CATEGORIA')) {
    return 'tag-outline';
  }

  if (normalizedEyebrow.includes('MOVIMIENTO')) {
    return 'format-list-bulleted';
  }

  if (normalizedEyebrow.includes('PRESUPUESTO')) {
    return 'chart-donut';
  }

  if (normalizedEyebrow.includes('SUSCRIPCION')) {
    return 'calendar-sync-outline';
  }

  if (normalizedEyebrow.includes('AHORRO')) {
    return 'treasure-chest-outline';
  }

  if (normalizedEyebrow.includes('MAS')) {
    return 'dots-horizontal-circle-outline';
  }

  return 'view-dashboard-outline';
}

export function AppScreenHeader({
  eyebrow,
  style,
  withBottomGap = false,
}: AppScreenHeaderProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const titleColor = colorScheme === 'light' ? colors.text : colors.pure;
  const markerIcon = getMeowneyMarkerIcon(eyebrow);

  return (
    <View style={[styles.header, withBottomGap ? styles.headerBottomGap : null, style]}>
      <View style={styles.eyebrowRow}>
        <Text style={[styles.eyebrow, { color: titleColor }]}>{eyebrow}</Text>
        <MaterialCommunityIcons name={markerIcon} size={18} color={colors.mutedText} />
      </View>
    </View>
  );
}

export function AppScreen({
  children,
  contentContainerStyle,
  eyebrow,
  scroll = false,
  subtitle,
  title,
}: AppScreenProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  const content = (
    <>
      <AppScreenHeader eyebrow={eyebrow} subtitle={subtitle} title={title} />
      {children}
    </>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, { backgroundColor: colors.background }, contentContainerStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: 0,
  },
  eyebrowRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBottomGap: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    flexShrink: 1,
    fontSize: typography.screenTitleSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0,
    lineHeight: typography.screenTitleLineHeight,
  },
});


