import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MeowneyColors } from "@/theme/colors";

export type NotebookIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const NOTEBOOK_ICON_OPTIONS: NotebookIconName[] = [
  "notebook-outline",
  "cat",
  "fish",
  "bell-outline",
  "wallet-outline",
  "bank-outline",
  "chart-line",
  "cash-multiple",
  "piggy-bank-outline",
  "safe-square-outline",
  "briefcase-outline",
  "credit-card-outline",
  "home-outline",
  "paw-outline",
  "mouse-variant",
];

export const NOTEBOOK_CURRENCY_OPTIONS = ["MXN", "USD", "EUR"];

export function getNotebookColorOptions(colors: MeowneyColors) {
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
