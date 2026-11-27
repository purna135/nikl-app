import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideFlash, useFlash } from '@/lib/flash';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/** The short message at the top of the screen ("Posted …"). Tap to hide it. */
export function FlashBanner() {
  const t = useNiklTheme();
  const insets = useSafeAreaInsets();
  const flash = useFlash();
  if (!flash) return null;
  return (
    <Pressable
      key={flash.id}
      onPress={hideFlash}
      accessibilityRole="alert"
      accessibilityHint="Hides this message"
      style={[styles.banner, { top: insets.top + space.sm, backgroundColor: t.ink }]}>
      <Text style={[styles.text, { color: t.app }]}>{flash.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    minHeight: touchTarget,
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontSize: fontSize.md, fontWeight: '600', lineHeight: 19 },
});
