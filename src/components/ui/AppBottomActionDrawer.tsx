import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useMeowneyColorScheme } from "@/hooks/useMeowneyColorScheme";
import { darkColors, lightColors, type MeowneyColors } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

const ACTION_DRAWER_TAB_HEIGHT = 28;

type AppBottomActionDrawerProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  openHeight?: number;
  style?: StyleProp<ViewStyle>;
  onClose?: () => void;
};

export function AppBottomActionDrawer({
  children,
  contentStyle,
  openHeight = 88,
  style,
  onClose,
}: AppBottomActionDrawerProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === "light" ? lightColors : darkColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(true);
  const progress = useRef(new Animated.Value(1)).current;

  const setOpen = (nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      onClose?.();
    }

    Animated.timing(progress, {
      toValue: nextOpen ? 1 : 0,
      duration: nextOpen ? motion.createMenuOpenDuration : motion.createMenuCloseDuration,
      easing: nextOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 8,
        onStartShouldSetPanResponder: () => false,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 10) {
            setOpen(false);
            return;
          }

          if (gestureState.dy < -10) {
            setOpen(true);
          }
        },
      }),
    [setOpen],
  );

  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const panelTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [openHeight, 0],
  });
  const tabTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [openHeight, 0],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        style,
        styles.drawer,
        { height: openHeight + ACTION_DRAWER_TAB_HEIGHT },
      ]}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[styles.tabWrap, { transform: [{ translateY: tabTranslateY }] }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isOpen ? "Cerrar acciones" : "Abrir acciones"}
          onPress={() => setOpen(!isOpen)}
          {...panResponder.panHandlers}
          style={({ pressed }) => [
            styles.tab,
            pressed ? styles.controlPressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name={isOpen ? "chevron-down" : "chevron-up"}
            size={22}
            color={colors.mutedText}
          />
        </Pressable>
      </Animated.View>

      <View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[styles.panelClip, contentStyle, { height: openHeight }]}
      >
        <Animated.View
          style={[
            styles.panel,
            {
              opacity: contentOpacity,
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <View style={styles.actionSlot}>{children}</View>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(colors: MeowneyColors) {
  return StyleSheet.create({
    drawer: {
      position: "absolute",
      right: 0,
      bottom: 0,
      left: 0,
      alignSelf: "stretch",
      overflow: "visible",
      zIndex: 4,
    },
    tabWrap: {
      position: "absolute",
      right: 0,
      left: 0,
      alignItems: "center",
      zIndex: 2,
    },
    tab: {
      width: 64,
      height: ACTION_DRAWER_TAB_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.button,
      backgroundColor: colors.selected,
    },
    panelClip: {
      alignSelf: "stretch",
      overflow: "hidden",
      marginTop: ACTION_DRAWER_TAB_HEIGHT,
    },
    controlPressed: {
      backgroundColor: colors.pressed,
    },
    actionSlot: {
      width: "100%",
      alignItems: "center",
    },
    panel: {
      alignSelf: "stretch",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
  });
}
