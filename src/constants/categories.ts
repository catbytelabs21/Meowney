import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CategoryType } from "@/features/categories/types";
import type { MeowneyColors } from "@/theme/colors";

export type CategoryIconName = keyof typeof MaterialCommunityIcons.glyphMap;
export type CategoryTypeFilter = "all" | CategoryType;
export type CategorySort = "nameAsc" | "nameDesc" | "updatedDesc";

export const CATEGORY_ICON_OPTIONS: CategoryIconName[] = [
  "briefcase-outline",
  "cash-plus",
  "gift-outline",
  "cart-outline",
  "silverware-fork-knife",
  "bus",
  "home-outline",
  "heart-pulse",
  "movie-open-outline",
  "dots-horizontal-circle-outline",
];

export const CATEGORY_TYPE_OPTIONS: { label: string; value: CategoryType }[] = [
  { label: "Ingreso", value: "income" },
  { label: "Gasto", value: "expense" },
];

export const CATEGORY_TYPE_FILTER_OPTIONS: {
  label: string;
  value: CategoryTypeFilter;
}[] = [
  { label: "Todos", value: "all" },
  { label: "Ingresos", value: "income" },
  { label: "Gastos", value: "expense" },
];

export const CATEGORY_SORT_OPTIONS: { label: string; value: CategorySort }[] = [
  { label: "Nombre A-Z", value: "nameAsc" },
  { label: "Nombre Z-A", value: "nameDesc" },
  { label: "Recientes", value: "updatedDesc" },
];

export function getCategoryColorOptions(colors: MeowneyColors) {
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
