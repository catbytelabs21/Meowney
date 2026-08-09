import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router } from 'expo-router';
import { AppHeader } from './AppHeader';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RouteScreenProps = {
  actions?: {
    label: string;
    href: Href<string | object>;
  }[];
  headerLeft?: ReactNode;
  headerTitle?: string;
  title: string;
};

export function RouteScreen({ actions = [], headerLeft, headerTitle, title }: RouteScreenProps) {
  return (
    <View style={styles.safeArea}>
      {headerTitle ? <AppHeader title={headerTitle} left={headerLeft} /> : null}
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.contentSafeArea}>
        <View style={styles.container}>
          <Text variant="headlineMedium">{title}</Text>
          {actions.map((action) => (
            <Button
              key={action.label}
              mode="contained"
              onPress={() => router.push(action.href)}
              style={styles.button}
            >
              {action.label}
            </Button>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  button: {
    marginTop: spacing.md,
  },
});
