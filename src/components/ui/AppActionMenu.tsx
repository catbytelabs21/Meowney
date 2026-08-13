import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Menu } from 'react-native-paper';
import { motion } from '@/theme/motion';

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
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (visible) {
      setIsMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.actionMenuOpenDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: motion.actionMenuCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [progress, visible]);

  const animatedContentStyle = [
    contentStyle,
    {
      opacity: progress,
      transform: [
        {
          translateX: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.84, 1],
          }),
        },
      ],
    },
  ] as unknown as StyleProp<ViewStyle>;

  return (
    <Menu
      visible={isMounted}
      onDismiss={onDismiss}
      contentStyle={animatedContentStyle}
      anchor={anchor}
    >
      {children}
    </Menu>
  );
}
