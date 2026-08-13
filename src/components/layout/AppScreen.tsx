import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export function AppScreenHeader({
  eyebrow,
  subtitle,
  title,
  style,
  withBottomGap = false,
}: AppScreenHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <View style={[styles.header, withBottomGap ? styles.headerBottomGap : null, style]}>
      <Text style={[styles.eyebrow, { color: colors.mutedText }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text> : null}
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
  const colorScheme = useColorScheme();
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
    gap: spacing.sm,
  },
  headerBottomGap: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: typography.monoLabelSize,
    fontWeight: typography.mediumWeight,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: typography.headingSize,
    fontWeight: typography.titleWeight,
    lineHeight: typography.headingLineHeight,
  },
  subtitle: {
    fontSize: typography.bodySize,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
});
