import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { motion } from '@/theme/motion';

type AppAnimatedDisclosureProps = {
  children: ReactNode;
  maxHeight: number;
  mode?: 'inline' | 'overlay';
  overlayContentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
};

export function AppAnimatedDisclosure({
  children,
  maxHeight,
  mode = 'inline',
  overlayContentStyle,
  style,
  visible,
}: AppAnimatedDisclosureProps) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const isOverlay = mode === 'overlay';

  useEffect(() => {
    progress.stopAnimation();

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible
        ? motion.disclosureOpenDuration
        : motion.disclosureCloseDuration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: isOverlay,
    }).start();
  }, [isOverlay, progress, visible]);

  if (isOverlay) {
    const overlayAnimatedStyle = {
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-12, 0],
          }),
        },
      ],
    };

    return (
      <View
        pointerEvents={visible ? 'box-none' : 'none'}
        style={[style, { maxHeight, overflow: 'hidden' }]}
      >
        <Animated.View style={[overlayContentStyle, overlayAnimatedStyle]}>
          {children}
        </Animated.View>
      </View>
    );
  }

  const animatedStyle = {
    opacity: progress,
    maxHeight: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxHeight],
    }),
    overflow: 'hidden' as const,
  };

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
