import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card mode="contained" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineMedium">Meowney</Text>
            <Text variant="bodyLarge" style={styles.description}>
              Base Expo lista con navegacion, UI, estado, formularios,
              validacion, SQLite, fechas, iconos, fuentes y splash screen.
            </Text>
            <Button icon="arrow-right" mode="contained">
              Continuar
            </Button>
          </Card.Content>
        </Card>
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
    padding: 24,
  },
  card: {
    borderRadius: 8,
  },
  cardContent: {
    gap: 16,
  },
  description: {
    color: '#475569',
  },
});
