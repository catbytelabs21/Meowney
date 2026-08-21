import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Surface, Text } from "react-native-paper";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { darkColors, lightColors } from "@/theme/colors";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type AppEmptyStateProps = {
  action?: ReactNode;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  message: string;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function AppEmptyState({
  action,
  message,
  style,
  title,
}: AppEmptyStateProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === "light" ? lightColors : darkColors;

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
      elevation={0}
    >
      <View style={styles.iconStage}>
        <MaterialCommunityIcons name="fish" size={36} color={colors.mutedText} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.card,
    overflow: "hidden",
    padding: spacing.lg,
  },
  iconStage: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.subheadingSize,
    fontWeight: typography.bodyWeight,
    textAlign: "center",
  },
  message: {
    fontSize: typography.bodySmallSize,
    lineHeight: 22,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.xs,
  },
});
