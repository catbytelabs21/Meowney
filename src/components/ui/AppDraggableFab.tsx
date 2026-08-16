import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/spacing';

const LONG_PRESS_DELAY = 320;
const DEFAULT_FAB_RIGHT = spacing.lg;
const DEFAULT_FAB_BOTTOM = 88;

type AppDraggableFabProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function AppDraggableFab({ children, style }: AppDraggableFabProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStart = useRef({ x: 0, y: 0 });
  const canDrag = useRef(false);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layout, setLayout] = useState({ height: 0, width: 0 });

  const bounds = useMemo(() => {
    const horizontalMargin = spacing.sm;
    const topMargin = Math.max(spacing.sm, insets.top + spacing.sm);
    const bottomMargin = Math.max(spacing.sm, insets.bottom + spacing.sm);

    return {
      maxX: DEFAULT_FAB_RIGHT - horizontalMargin,
      maxY: DEFAULT_FAB_BOTTOM - bottomMargin,
      minX: -Math.max(0, width - DEFAULT_FAB_RIGHT - layout.width - horizontalMargin),
      minY: -Math.max(0, height - DEFAULT_FAB_BOTTOM - layout.height - topMargin),
    };
  }, [height, insets.bottom, insets.top, layout.height, layout.width, width]);

  const clearLongPress = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const startLongPress = () => {
    clearLongPress();
    longPressTimeout.current = setTimeout(() => {
      canDrag.current = true;
    }, LONG_PRESS_DELAY);
  };

  const stopDrag = () => {
    clearLongPress();
    canDrag.current = false;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          canDrag.current && Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          clearLongPress();
          position.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          position.setValue({
            x: clamp(dragStart.current.x + gestureState.dx, bounds.minX, bounds.maxX),
            y: clamp(dragStart.current.y + gestureState.dy, bounds.minY, bounds.maxY),
          });
        },
        onPanResponderRelease: stopDrag,
        onPanResponderTerminate: stopDrag,
        onPanResponderTerminationRequest: () => true,
      }),
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, position],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextLayout = event.nativeEvent.layout;

    setLayout((currentLayout) =>
      currentLayout.height === nextLayout.height && currentLayout.width === nextLayout.width
        ? currentLayout
        : { height: nextLayout.height, width: nextLayout.width },
    );
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={handleLayout}
      onTouchCancel={stopDrag}
      onTouchEnd={stopDrag}
      onTouchStart={startLongPress}
      style={[styles.wrap, style, { transform: position.getTranslateTransform() }]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});
