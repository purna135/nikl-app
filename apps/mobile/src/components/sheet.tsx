import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/**
 * A bottom sheet over a dimmed screen (prototype `.sheet`). Tapping outside, the back button or
 * "Cancel" closes it. One sheet can change its content (menu → report → thanks) instead of
 * stacking a second one, which phones handle badly.
 */
export function Sheet({ visible, onClose, label, children }: { visible: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const t = useNiklTheme();
  const insets = useSafeAreaInsets();
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    let active = true;
    rise.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled().then(
      (reduce) => {
        if (!active) return;
        if (reduce) rise.setValue(1);
        else Animated.spring(rise, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 260, mass: 0.9 }).start();
      },
      () => rise.setValue(1),
    );
    return () => {
      active = false;
    };
  }, [visible, rise]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.wrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, space.md) + space.sm, transform: [{ translateY }] }]}>
          <View style={[styles.grab, { backgroundColor: t.line }]} />
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetTitle({ children, body }: { children: string; body?: string }) {
  const t = useNiklTheme();
  return (
    <View style={styles.titleBox}>
      <Text style={[styles.title, { color: t.ink }]} accessibilityRole="header">
        {children}
      </Text>
      {body ? <Text style={[styles.body, { color: t.muted }]}>{body}</Text> : null}
    </View>
  );
}

/** One row in a sheet: an emoji, a label and an optional line under it. `danger` is for delete and block. */
export function SheetRow({
  emoji,
  label,
  sub,
  danger,
  onPress,
  hint,
}: {
  emoji?: string;
  label: string;
  sub?: string;
  danger?: boolean;
  onPress: () => void;
  hint?: string;
}) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surface2 : 'transparent' }]}>
      {emoji ? (
        <View style={[styles.rowIcon, { backgroundColor: t.surface2 }]}>
          <Text style={styles.rowEmoji}>{emoji}</Text>
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? t.like : t.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.muted }]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', paddingTop: space.sm },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.sm },
  content: { paddingHorizontal: space.lg, gap: space.xs },
  titleBox: { gap: space.xs, paddingVertical: space.sm },
  title: { fontSize: fontSize.lg + 2, fontWeight: '700' },
  body: { fontSize: fontSize.md, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touchTarget + 8, paddingHorizontal: space.sm, borderRadius: radius.md },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 20 },
  rowText: { flex: 1, paddingVertical: space.sm },
  rowLabel: { fontSize: fontSize.md + 1, fontWeight: '600' },
  rowSub: { fontSize: fontSize.sm, marginTop: 1 },
});
