import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { IconButton, Portal, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { AppContentDialog } from '@/components/ui/AppFormDialog';
import { darkColors, lightColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppScreenHeaderProps = {
  eyebrow: string;
  helpMessage?: string;
  helpTitle?: string;
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
  helpMessage,
  helpTitle,
  style,
  withBottomGap = false,
}: AppScreenHeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const titleColor = colorScheme === 'light' ? colors.text : colors.pure;
  const hasHelp = Boolean(helpMessage);

  return (
    <>
      <View style={[styles.header, withBottomGap ? styles.headerBottomGap : null, style]}>
        <View style={styles.eyebrowRow}>
          <Text style={[styles.eyebrow, { color: titleColor }]}>{eyebrow}</Text>
          {hasHelp ? (
            <IconButton
              accessibilityLabel={`Ayuda de ${eyebrow}`}
              icon="help-circle-outline"
              iconColor={colors.mutedText}
              size={22}
              style={styles.helpButton}
              onPress={() => setIsHelpOpen(true)}
            />
          ) : null}
        </View>
      </View>
      {hasHelp ? (
        <Portal>
          <AppContentDialog
            visible={isHelpOpen}
            title={helpTitle ?? `Que es ${eyebrow.toLowerCase()}?`}
            titleIcon="help-circle-outline"
            titleIconColor={colors.text}
            contentContainerStyle={styles.helpDialogContent}
            onAction={() => setIsHelpOpen(false)}
            onDismiss={() => setIsHelpOpen(false)}
          >
            <Text style={[styles.helpDialogText, { color: colors.mutedText }]}>{helpMessage}</Text>
          </AppContentDialog>
        </Portal>
      ) : null}
    </>
  );
}

export function AppScreen({
  children,
  contentContainerStyle,
  eyebrow,
  helpMessage,
  helpTitle,
  scroll = false,
  subtitle,
  title,
}: AppScreenProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  const content = (
    <>
      <AppScreenHeader
        eyebrow={eyebrow}
        helpMessage={helpMessage}
        helpTitle={helpTitle}
        subtitle={subtitle}
        title={title}
      />
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  helpButton: {
    width: 40,
    height: 40,
    margin: 0,
    borderRadius: radii.navItem,
  },
  helpDialogContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  helpDialogText: {
    fontSize: typography.bodySize,
    lineHeight: 24,
    textAlign: 'justify',
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


