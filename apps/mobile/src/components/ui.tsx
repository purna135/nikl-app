import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/** Screen wrapper: safe area, theme background, scrollable content. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useNiklTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'wordmark';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const t = useNiklTheme();
  const v = {
    wordmark: { fontSize: 28, fontWeight: '800', letterSpacing: -1, color: t.ink },
    title: { fontSize: fontSize.display, fontWeight: '700', letterSpacing: -0.6, color: t.ink },
    heading: { fontSize: fontSize.xl, fontWeight: '700', letterSpacing: -0.3, color: t.ink },
    body: { fontSize: fontSize.md + 1, color: t.ink },
    muted: { fontSize: fontSize.md, color: t.muted },
    small: { fontSize: fontSize.sm, color: t.muted },
  } as const;
  return <Text {...props} style={[v[variant], style]} />;
}

/** "Nikl" with the pink dot. */
export function Wordmark() {
  const t = useNiklTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Nikl">
      <T variant="wordmark">Nikl</T>
      <View style={[styles.dot, { backgroundColor: t.accent }]} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'dark';
  disabled?: boolean;
  busy?: boolean;
}) {
  const t = useNiklTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'dark' ? t.ink : t.surface2;
  const fg = kind === 'primary' ? t.onAccent : kind === 'dark' ? t.app : t.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

/** Dashed placeholder used for features that arrive in later weeks. */
export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const t = useNiklTheme();
  return (
    <View style={[styles.empty, { borderColor: t.line }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T variant="muted" style={{ textAlign: 'center' }}>
        {body}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginLeft: 3, marginTop: 10 },
  button: { minHeight: touchTarget + 4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonText: { fontSize: fontSize.lg, fontWeight: '600' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: space.xl, gap: space.sm, alignItems: 'center' },
  emoji: { fontSize: 34 },
});
