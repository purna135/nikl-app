import { Image } from 'expo-image';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TintName } from '@nikl/tokens';
import { categoryLook } from '@/lib/explore';
import { personPhotoUrl } from '@/lib/social';
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
  more: { ios: 'ellipsis', android: 'more_horiz' },
  plus: { ios: 'plus.app', android: 'add_box' },
  close: { ios: 'xmark', android: 'close' },
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
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 0 && !/^[&+\-–—·|/,.]/.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
}

/** A story ring around an avatar: accent while there are stories you haven't seen, grey once you've seen them all. */
export type StoryRing = boolean | 'unseen' | 'seen';

/** A round photo or initials, with an optional story ring. Ringed or not, it takes the same space. */
function AvatarFrame({ size, ring, photoUrl, initialsText, tint }: { size: number; ring: StoryRing; photoUrl: string | null; initialsText: string; tint: TintName }) {
  const t = useNiklTheme();
  const gap = size >= 56 ? 3 : 2;
  const face = (
    <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, backgroundColor: photoUrl ? t.surface2 : t.tints[tint] }]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initials, { color: t.onTint, fontSize: Math.round(size * 0.34) }]}>{initialsText}</Text>
      )}
    </View>
  );
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ring ? (
        <View style={[styles.ring, { backgroundColor: ring === 'seen' ? t.line : t.accent, borderRadius: size }]}>
          <View style={{ borderWidth: gap, borderColor: t.app, borderRadius: size }}>{face}</View>
        </View>
      ) : (
        <View style={{ padding: 2 + gap }}>{face}</View>
      )}
    </View>
  );
}

/** A club's round logo, or its initials on the soft tint of its category. */
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
  ring?: StoryRing;
}) {
  return <AvatarFrame size={size} ring={ring} photoUrl={logoUrl} initialsText={initials(name)} tint={categoryLook(category).tint} />;
}

const PERSON_TINTS: TintName[] = ['pink', 'sun', 'mint', 'sky', 'tang', 'grape'];

/** Same person, same colour: a tint picked from their id. */
function personTint(seed: string): TintName {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PERSON_TINTS[hash % PERSON_TINTS.length]!;
}

/** A person's round photo (only from Nikl's own storage), or their initials on a soft tint. */
export function PersonAvatar({
  name,
  avatarUrl,
  seed,
  size,
  ring = false,
}: {
  name: string;
  avatarUrl: string | null;
  /** Their user id, so the tint stays the same everywhere. */
  seed: string;
  size: number;
  ring?: StoryRing;
}) {
  return <AvatarFrame size={size} ring={ring} photoUrl={personPhotoUrl(avatarUrl)} initialsText={initials(name)} tint={personTint(seed)} />;
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

/** Follow / Following. Accent when you can follow, quiet once you do. `name` is the club or person. */
export function FollowButton({
  following,
  onPress,
  name,
  size = 'md',
}: {
  following: boolean;
  onPress: () => void;
  name: string;
  size?: 'sm' | 'md';
}) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={size === 'sm' ? { top: smallSlop, bottom: smallSlop } : undefined}
      accessibilityRole="togglebutton"
      accessibilityLabel={`Follow ${name}`}
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
