import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Button, IconButton, Menu, Tooltip } from "react-native-paper";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { darkColors, lightColors } from "@/theme/colors";

type AppSelectMenuOption<Value extends string> = {
  label: string;
  value: Value;
};

type AppSelectMenuProps<Value extends string> = {
  anchor?: "button" | "icon";
  buttonContentStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconButtonStyle?: StyleProp<ViewStyle>;
  label: string;
  menuContentStyle?: StyleProp<ViewStyle>;
  options: AppSelectMenuOption<Value>[];
  selectedLabel: string;
  selectedValue: Value;
  onSelect: (value: Value) => void;
};

export function AppSelectMenu<Value extends string>({
  anchor = "button",
  buttonContentStyle,
  buttonStyle,
  icon,
  iconButtonStyle,
  label,
  menuContentStyle,
  options,
  selectedLabel,
  selectedValue,
  onSelect,
}: AppSelectMenuProps<Value>) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === "light" ? lightColors : darkColors;
  const [isOpen, setIsOpen] = useState(false);

  const anchorNode =
    anchor === "icon" ? (
      <Tooltip title={label}>
        <IconButton
          accessibilityLabel={`${label}. ${selectedLabel}`}
          icon={icon}
          iconColor={colors.text}
          size={20}
          onPress={() => setIsOpen(true)}
          style={iconButtonStyle}
        />
      </Tooltip>
    ) : (
      <Button
        mode="outlined"
        icon={icon}
        onPress={() => setIsOpen(true)}
        style={buttonStyle}
        contentStyle={buttonContentStyle}
        textColor={colors.text}
      >
        {selectedLabel}
      </Button>
    );

  return (
    <Menu
      visible={isOpen}
      onDismiss={() => setIsOpen(false)}
      contentStyle={menuContentStyle}
      anchor={anchorNode}
    >
      {options.map((option) => (
        <Menu.Item
          key={option.value}
          leadingIcon={selectedValue === option.value ? "check" : undefined}
          title={option.label}
          onPress={() => {
            onSelect(option.value);
            setIsOpen(false);
          }}
        />
      ))}
    </Menu>
  );
}
