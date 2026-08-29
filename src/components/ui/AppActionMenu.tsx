import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Menu } from 'react-native-paper';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { getMeowneyColors, type MeowneyColors } from '@/theme/colors';
import { radii } from '@/theme/radii';

type AppActionMenuProps = {
  anchor: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  visible: boolean;
  onDismiss: () => void;
};

export function AppActionMenu({
  anchor,
  children,
  contentStyle,
  visible,
  onDismiss,
}: AppActionMenuProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = getMeowneyColors(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      contentStyle={[styles.content, contentStyle]}
      anchor={anchor}
    >
      {children}
    </Menu>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    content: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.surfaceAlt,
    },
  });
}
