import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type AppMeowneySnackbarProps = {
  message: string | null;
  onDismiss: () => void;
};

export function AppMeowneySnackbar({
  message,
  onDismiss,
}: AppMeowneySnackbarProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Portal>
      <Snackbar
        visible={Boolean(message)}
        duration={2600}
        onDismiss={onDismiss}
        action={{
          label: 'OK',
          onPress: onDismiss,
          textColor: colors.primary,
        }}
        style={styles.snackbar}
        wrapperStyle={styles.wrapper}
        theme={{
          colors: {
            inverseOnSurface: colors.text,
            inversePrimary: colors.primary,
            inverseSurface: colors.surfaceAlt,
          },
        }}
      >
        {message}
      </Snackbar>
    </Portal>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    wrapper: {
      bottom: 84,
      paddingHorizontal: spacing.md,
    },
    snackbar: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
  });
}
