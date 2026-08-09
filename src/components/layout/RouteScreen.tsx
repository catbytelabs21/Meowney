import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router } from 'expo-router';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RouteScreenProps = {
  title: string;
  actions?: {
    label: string;
    href: Href<string | object>;
  }[];
};

export function RouteScreen({ title, actions = [] }: RouteScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
