import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { motion } from '@/theme/motion';

type AppAnimatedDisclosureProps = {
  children: ReactNode;
  maxHeight: number;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
};

export function AppAnimatedDisclosure({
  children,
  maxHeight,
  style,
  visible,
}: AppAnimatedDisclosureProps) {
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (visible) {
      setIsMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.disclosureOpenDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: motion.disclosureCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [progress, visible]);

  if (!isMounted) {
    return null;
  }

  const animatedStyle = {
    opacity: progress,
    maxHeight: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxHeight],
    }),
    overflow: 'hidden' as const,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-14, 0],
        }),
      },
      {
        scaleY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
