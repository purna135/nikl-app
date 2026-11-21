import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

const CHIP_HEIGHT = 38;
const slop = (touchTarget - CHIP_HEIGHT) / 2 + 1;

/** A toggleable filter pill. Selected chips are solid ink; the rest sit quietly on surface2. */
export function FilterChip({
  label,
  emoji,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? t.ink : t.surface2, opacity: pressed ? 0.8 : 1 }]}>
      <Text style={[styles.text, { color: selected ? t.app : t.ink }]}>{emoji ? `${emoji} ${label}` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: CHIP_HEIGHT, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
  text: { fontSize: fontSize.md, fontWeight: '600' },
});
