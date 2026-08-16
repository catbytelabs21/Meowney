import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AccountType } from "@/features/accounts/types";
import type { MeowneyColors } from "@/theme/colors";

export type AccountIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const ACCOUNT_ICON_OPTIONS: AccountIconName[] = [
  "wallet-outline",
  "bank-outline",
  "cash",
  "credit-card-outline",
  "piggy-bank-outline",
  "safe-square-outline",
  "briefcase-outline",
  "home-outline",
  "cart-outline",
  "chart-line",
];

export const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: "Efectivo", value: "CASH" },
  { label: "Banco", value: "BANK_ACCOUNT" },
  { label: "Debito", value: "DEBIT_CARD" },
  { label: "Wallet", value: "DIGITAL_WALLET" },
  { label: "Ahorro", value: "SAVINGS" },
  { label: "Inversion", value: "INVESTMENT" },
  { label: "Otro", value: "OTHER" },
];

export function getAccountColorOptions(colors: MeowneyColors) {
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
