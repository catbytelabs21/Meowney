import { View } from "react-native";
import { AppHeader } from "@/components/layout/AppHeader";
import { NotebooksScreen } from "@/features/notebooks/NotebooksScreen";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { darkColors, lightColors } from "@/theme/colors";

export default function NotebooksRoute() {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === "light" ? lightColors : darkColors;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Meowney" />
      <NotebooksScreen />
    </View>
  );
}
