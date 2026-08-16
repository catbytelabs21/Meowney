import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Menu } from 'react-native-paper';

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
  return (
    <Menu visible={visible} onDismiss={onDismiss} contentStyle={contentStyle} anchor={anchor}>
      {children}
    </Menu>
  );
}
