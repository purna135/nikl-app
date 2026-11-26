import { Image } from 'expo-image';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryLook } from '@/lib/explore';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/**
 * Icons from the phone's own set: SF Symbols on iPhone, Material Symbols on Android (both in
 * Expo Go). Material Symbols here only come outlined, so "on" states on Android also change colour.
 */
const ICONS = {
  heart: { ios: 'heart', android: 'favorite' },
  heartOn: { ios: 'heart.fill', android: 'favorite' },
  comment: { ios: 'bubble.right', android: 'chat_bubble' },
  share: { ios: 'paperplane', android: 'send' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  bookmarkOn: { ios: 'bookmark.fill', android: 'bookmark_added' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, color, size = 26 }: { name: IconName; color: string; size?: number }) {
  const icon = ICONS[name];
  return <SymbolView name={{ ios: icon.ios, android: icon.android, web: icon.android }} size={size} tintColor={color} />;
}

/** A 44 px round icon button. Pass `on` for toggles (like, save); it is read out as on/off. */
export function IconButton({
  icon,
  label,
  hint,
  onPress,
  on,
  color,
  size,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  on?: boolean;
  color?: string;
  size?: number;
}) {
  const t = useNiklTheme();
  const toggle = on !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={toggle ? { checked: on } : undefined}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} color={color ?? t.ink} size={size} />
    </Pressable>
  );
}

/** Up to two initials: "Clay & Chai Studio" → "CC". */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 0 && !/^[&+\-–—·|/,.]/.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
}

/**
 * A club's round logo, or its initials on the soft tint of its category.
 * `ring` draws the accent ring that means "has a live story".
 */
export function ClubAvatar({
  name,
  logoUrl,
  category,
  size,
  ring = false,
}: {
  name: string;
  logoUrl: string | null;
  category: string;
  size: number;
  ring?: boolean;
}) {
  const t = useNiklTheme();
  const look = categoryLook(category);
  const gap = size >= 56 ? 3 : 2;
  const face = (
    <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, backgroundColor: logoUrl ? t.surface2 : t.tints[look.tint] }]}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initials, { color: t.onTint, fontSize: Math.round(size * 0.34) }]}>{initials(name)}</Text>
      )}
    </View>
  );
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ring ? (
        <View style={[styles.ring, { backgroundColor: t.accent, borderRadius: size }]}>
          <View style={{ borderWidth: gap, borderColor: t.app, borderRadius: size }}>{face}</View>
        </View>
      ) : (
        // Same footprint as a ringed avatar, so rows line up.
        <View style={{ padding: 2 + gap }}>{face}</View>
      )}
    </View>
  );
}

/** The small ink tick next to verified clubs. */
export function VerifiedTick({ size = 14 }: { size?: number }) {
  const t = useNiklTheme();
  return (
    <View
      style={[styles.tick, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.ink }]}
      accessible
      accessibilityLabel="Verified club">
      <Text style={[styles.tickGlyph, { color: t.app, fontSize: Math.round(size * 0.62) }]}>✓</Text>
    </View>
  );
}

const SMALL_HEIGHT = 34;
const smallSlop = (touchTarget - SMALL_HEIGHT) / 2;

/** Follow / Following. Accent when you can follow, quiet once you do. */
export function FollowButton({
  following,
  onPress,
  clubName,
  size = 'md',
}: {
  following: boolean;
  onPress: () => void;
  clubName: string;
  size?: 'sm' | 'md';
}) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={size === 'sm' ? { top: smallSlop, bottom: smallSlop } : undefined}
      accessibilityRole="togglebutton"
      accessibilityLabel={`Follow ${clubName}`}
      accessibilityState={{ checked: following }}
      style={({ pressed }) => [
        size === 'sm' ? styles.followSm : styles.followMd,
        { backgroundColor: following ? t.surface2 : t.accent, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Text style={[styles.followText, size === 'sm' && styles.followTextSm, { color: following ? t.ink : t.onAccent }]}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}

/** A small pill button (e.g. "RSVP" in a post's event strip). Its touch area is still 44 px tall. */
export function SmallButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: smallSlop, bottom: smallSlop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.small, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}>
      <Text style={[styles.followText, styles.followTextSm, { color: t.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontWeight: '700' },
  ring: { padding: 2 },
  tick: { alignItems: 'center', justifyContent: 'center' },
  tickGlyph: { fontWeight: '800' },
  followSm: { height: SMALL_HEIGHT, borderRadius: radius.sm + 1, paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  followMd: { minHeight: touchTarget, borderRadius: radius.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  followText: { fontSize: fontSize.md + 1, fontWeight: '600' },
  followTextSm: { fontSize: fontSize.md - 1 },
  small: { height: SMALL_HEIGHT, borderRadius: radius.sm + 1, paddingHorizontal: space.md + 2, alignItems: 'center', justifyContent: 'center' },
});
