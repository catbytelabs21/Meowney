import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors } from '@/theme/colors';

type HeaderIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type AppHeaderActionButtonProps = {
  accessibilityLabel: string;
  icon: HeaderIconName;
  onPress: () => void;
};

export function AppHeaderActionButton({
  accessibilityLabel,
  icon,
  onPress,
}: AppHeaderActionButtonProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.55 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


