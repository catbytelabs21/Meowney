import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { type MeowneyColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppLoadingStateProps = {
  colors: MeowneyColors;
  label?: string;
};

export function AppLoadingState({ colors, label = 'Cargando informacion' }: AppLoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator animating color={colors.primary} size="small" />
      <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: {
    fontSize: typography.bodySmallSize,
    lineHeight: 22,
    textAlign: 'center',
  },
});
