import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button, Dialog, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMeowneyColorScheme } from '@/hooks/useMeowneyColorScheme';
import { darkColors, lightColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const FORM_BAR_HEIGHT = spacing.xxl + spacing.md;

type AppFormDialogProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  saveLabel?: string;
  scrollRef?: RefObject<ScrollView | null>;
  title: string;
  titleIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  titleIconColor?: string;
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
};

type AppFormDialogSnapshot = Pick<
  AppFormDialogProps,
  'children' | 'contentContainerStyle' | 'saveLabel' | 'title' | 'titleIcon' | 'titleIconColor'
>;

type AppContentDialogProps = {
  actionLabel?: string;
  actionTextColor?: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  title: string;
  titleIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  titleIconColor?: string;
  visible: boolean;
  onAction: () => void;
  onDismiss: () => void;
};

type AppContentDialogSnapshot = Pick<
  AppContentDialogProps,
  'actionLabel' | 'actionTextColor' | 'children' | 'contentContainerStyle' | 'title' | 'titleIcon' | 'titleIconColor'
>;

type AppConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  confirmTextColor?: string;
  message: string;
  title: string;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AppFormDialog({
  children,
  contentContainerStyle,
  saveLabel = 'Guardar',
  scrollRef,
  title,
  titleIcon,
  titleIconColor,
  visible,
  onCancel,
  onSave,
}: AppFormDialogProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const dialogVerticalMargin = Math.max(spacing.lg, Math.max(insets.top, insets.bottom) + spacing.md);
  const dialogHeight = height - dialogVerticalMargin * 2;
  const [isMounted, setIsMounted] = useState(visible);
  const liveSnapshot = useMemo<AppFormDialogSnapshot>(
    () => ({
      children,
      contentContainerStyle,
      saveLabel,
      title,
      titleIcon,
      titleIconColor,
    }),
    [children, contentContainerStyle, saveLabel, title, titleIcon, titleIconColor],
  );
  const snapshotRef = useRef(liveSnapshot);
  if (visible) {
    snapshotRef.current = liveSnapshot;
  }
  const renderedSnapshot = visible ? liveSnapshot : snapshotRef.current;
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (visible) {
      setIsMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.formDialogOpenDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: motion.formDialogCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [progress, visible]);

  const animatedDialogStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  if (!isMounted) {
    return null;
  }

  return (
    <View style={styles.modal}>
      <Animated.View style={[styles.modalBackdrop, { opacity: progress }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar formulario"
          style={styles.modalBackdropPressable}
          onPress={onCancel}
        />
      </Animated.View>
      <Animated.View style={animatedDialogStyle}>
        <Surface
          elevation={0}
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, height: dialogHeight, marginVertical: dialogVerticalMargin },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            style={styles.shell}
          >
            <View style={styles.titleBar}>
              {renderedSnapshot.titleIcon ? (
                <MaterialCommunityIcons
                  name={renderedSnapshot.titleIcon}
                  size={18}
                  color={renderedSnapshot.titleIconColor ?? colors.mutedText}
                />
              ) : null}
              <NativeText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                {renderedSnapshot.title}
              </NativeText>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ScrollView
              ref={scrollRef}
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={renderedSnapshot.contentContainerStyle}
            >
              {renderedSnapshot.children}
            </ScrollView>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.actions}>
              <Button textColor={colors.mutedText} onPress={onCancel}>
                Cancelar
              </Button>
              <Button icon="cat" textColor={colors.success} onPress={onSave}>
                {renderedSnapshot.saveLabel}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Surface>
      </Animated.View>
    </View>
  );
}

export function AppContentDialog({
  actionLabel = 'Cerrar',
  actionTextColor,
  children,
  contentContainerStyle,
  title,
  titleIcon,
  titleIconColor,
  visible,
  onAction,
  onDismiss,
}: AppContentDialogProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const dialogVerticalMargin = Math.max(spacing.lg, Math.max(insets.top, insets.bottom) + spacing.md);
  const dialogMaxHeight = height - dialogVerticalMargin * 2;
  const [isMounted, setIsMounted] = useState(visible);
  const liveSnapshot = useMemo<AppContentDialogSnapshot>(
    () => ({
      actionLabel,
      actionTextColor,
      children,
      contentContainerStyle,
      title,
      titleIcon,
      titleIconColor,
    }),
    [actionLabel, actionTextColor, children, contentContainerStyle, title, titleIcon, titleIconColor],
  );
  const snapshotRef = useRef(liveSnapshot);
  if (visible) {
    snapshotRef.current = liveSnapshot;
  }
  const renderedSnapshot = visible ? liveSnapshot : snapshotRef.current;
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (visible) {
      setIsMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.formDialogOpenDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: motion.formDialogCloseDuration,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [progress, visible]);

  const animatedDialogStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  if (!isMounted) {
    return null;
  }

  return (
    <View style={styles.modal}>
      <Animated.View style={[styles.modalBackdrop, { opacity: progress }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar detalle"
          style={styles.modalBackdropPressable}
          onPress={onDismiss}
        />
      </Animated.View>
      <Animated.View style={animatedDialogStyle}>
        <Surface
          elevation={0}
          style={[
            styles.dialog,
            styles.contentDialog,
            { backgroundColor: colors.surface, maxHeight: dialogMaxHeight, marginVertical: dialogVerticalMargin },
          ]}
        >
          <View style={styles.titleBar}>
            {renderedSnapshot.titleIcon ? (
              <MaterialCommunityIcons
                name={renderedSnapshot.titleIcon}
                size={18}
                color={renderedSnapshot.titleIconColor ?? colors.mutedText}
              />
            ) : null}
            <NativeText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {renderedSnapshot.title}
            </NativeText>
          </View>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.contentScroll}
            contentContainerStyle={renderedSnapshot.contentContainerStyle}
          >
            {renderedSnapshot.children}
          </ScrollView>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <View style={styles.actions}>
            <Button textColor={renderedSnapshot.actionTextColor ?? colors.mutedText} onPress={onAction}>
              {renderedSnapshot.actionLabel}
            </Button>
          </View>
        </Surface>
      </Animated.View>
    </View>
  );
}

export function AppConfirmDialog({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Eliminar',
  confirmTextColor,
  message,
  title,
  visible,
  onCancel,
  onConfirm,
}: AppConfirmDialogProps) {
  const colorScheme = useMeowneyColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <Dialog visible={visible} onDismiss={onCancel} style={[styles.confirmDialog, { backgroundColor: colors.surface }]}>
      <Dialog.Title style={[styles.confirmTitle, { color: colors.text }]}>{title}</Dialog.Title>
      <Dialog.Content>
        <NativeText style={[styles.confirmText, { color: colors.mutedText }]}>{message}</NativeText>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onCancel}>{cancelLabel}</Button>
        <Button textColor={confirmTextColor ?? colors.error} onPress={onConfirm}>
          {confirmLabel}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  modal: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    margin: 0,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  dialog: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radii.card,
    width: '90%',
  },
  contentDialog: {
    maxWidth: 560,
  },
  shell: {
    flex: 1,
    minHeight: 0,
  },
  titleBar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    flexBasis: FORM_BAR_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    height: FORM_BAR_HEIGHT,
    justifyContent: 'flex-start',
    maxHeight: FORM_BAR_HEIGHT,
    minHeight: FORM_BAR_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: typography.subheadingSize,
    fontWeight: typography.bodyWeight,
    includeFontPadding: false,
    lineHeight: typography.subheadingSize,
    padding: 0,
    textAlignVertical: 'center',
  },
  scroll: {
    flex: 1,
  },
  contentScroll: {
    flexGrow: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    boxSizing: 'border-box',
    justifyContent: 'flex-end',
    flexBasis: FORM_BAR_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.sm,
    height: FORM_BAR_HEIGHT,
    maxHeight: FORM_BAR_HEIGHT,
    minHeight: FORM_BAR_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  confirmDialog: {
    borderRadius: radii.card,
  },
  confirmTitle: {
    fontWeight: typography.bodyWeight,
  },
  confirmText: {
    fontSize: typography.bodySize,
    lineHeight: 24,
  },
});


