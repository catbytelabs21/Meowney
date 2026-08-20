import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MeowneyColors } from "@/theme/colors";

export type GoalIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const GOAL_ICON_OPTIONS: GoalIconName[] = [
  "piggy-bank-outline",
  "cat",
  "fish",
  "bell-outline",
  "home-outline",
  "airplane",
  "car-outline",
  "school-outline",
  "gift-outline",
  "shield-check-outline",
  "laptop",
  "heart-outline",
  "star-outline",
  "paw-outline",
  "mouse-variant",
];

export function getGoalColorOptions(colors: MeowneyColors) {
  return [
    colors.irisGleam,
    colors.cyanSignal,
    colors.orchidBloom,
    colors.periwinkle,
    colors.paleIris,
    colors.deepIris,
    colors.success,
    colors.warning,
    colors.error,
    colors.silver,
  ];
}
