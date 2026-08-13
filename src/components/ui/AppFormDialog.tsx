import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button, Dialog, Modal, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const dialogVerticalMargin = Math.max(spacing.lg, Math.max(insets.top, insets.bottom) + spacing.md);
  const dialogHeight = height - dialogVerticalMargin * 2;
  const [isMounted, setIsMounted] = useState(visible);
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
    <Modal
      visible={isMounted}
      onDismiss={onCancel}
      style={styles.modal}
      contentContainerStyle={styles.modalContent}
    >
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
              {titleIcon ? <MaterialCommunityIcons name={titleIcon} size={18} color={titleIconColor ?? colors.mutedText} /> : null}
              <NativeText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                {title}
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
              contentContainerStyle={contentContainerStyle}
            >
              {children}
            </ScrollView>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.actions}>
              <Button textColor={colors.mutedText} onPress={onCancel}>
                Cancelar
              </Button>
              <Button textColor={colors.success} onPress={onSave}>
                {saveLabel}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Surface>
      </Animated.View>
    </Modal>
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
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'light' ? lightColors : darkColors;
  const dialogVerticalMargin = Math.max(spacing.lg, Math.max(insets.top, insets.bottom) + spacing.md);
  const dialogMaxHeight = height - dialogVerticalMargin * 2;
  const [isMounted, setIsMounted] = useState(visible);
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
    <Modal visible={isMounted} onDismiss={onDismiss} style={styles.modal} contentContainerStyle={styles.modalContent}>
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
            {titleIcon ? <MaterialCommunityIcons name={titleIcon} size={18} color={titleIconColor ?? colors.mutedText} /> : null}
            <NativeText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {title}
            </NativeText>
          </View>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.contentScroll}
            contentContainerStyle={contentContainerStyle}
          >
            {children}
          </ScrollView>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <View style={styles.actions}>
            <Button textColor={actionTextColor ?? colors.mutedText} onPress={onAction}>
              {actionLabel}
            </Button>
          </View>
        </Surface>
      </Animated.View>
    </Modal>
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
  const colorScheme = useColorScheme();
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
    justifyContent: 'center',
    margin: 0,
  },
  modalContent: {
    margin: 0,
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
