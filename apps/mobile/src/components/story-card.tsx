import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { formatEventDay, formatEventTime, priceSummary } from '@nikl/utils';
import { categoryLook } from '@/lib/explore';
import { fontSize, radius, space, useNiklTheme } from '@/theme';

/** The event a story is about, as far as the card needs it. */
export type StoryEvent = {
  title: string;
  category: string;
  posterUrl: string | null;
  startsAt: string | null;
  area: string | null;
  isFree: boolean;
  minPricePaise: number | null;
};

/** "Sat, 21 Nov, 7:30 PM · Patia · From ₹299": the sticker on event stories. */
export function storySticker(e: StoryEvent): string {
  const when = e.startsAt ? `${formatEventDay(e.startsAt)}, ${formatEventTime(e.startsAt)}` : null;
  return [when, e.area, priceSummary(e.isFree, e.minPricePaise)].filter(Boolean).join(' · ');
}

/** "Book · From ₹299" or "RSVP · Free". */
export function storyAction(e: StoryEvent): string {
  const price = priceSummary(e.isFree, e.minPricePaise);
  return price === 'Free' ? 'RSVP · Free' : `Book · ${price}`;
}

/**
 * A story drawn from data (DECISIONS.md P9): the kicker chip, the poster (or the category's emoji),
 * the event's title, a date · area · price sticker and the person's note. With `photoUri` the photo
 * fills the card instead and the sticker and note sit on top. `small` is the composer's preview.
 */
export function StoryCard({
  event,
  kicker,
  note,
  photoUri,
  small = false,
  onPhotoReady,
}: {
  event: StoryEvent | null;
  kicker: string | null;
  note: string | null;
  photoUri: string | null;
  small?: boolean;
  /** Photo stories wait for the photo before their timer starts. */
  onPhotoReady?: () => void;
}) {
  const t = useNiklTheme();
  const look = categoryLook(event?.category ?? 'other');
  const k = small ? 0.5 : 1;
  const sticker = event ? storySticker(event) : null;

  const stickers = (
    <View style={[styles.stickers, { gap: space.sm * k }]}>
      {sticker ? (
        <View style={[styles.sticker, small && styles.stickerSmall]}>
          <Text style={[styles.stickerText, { fontSize: (fontSize.md + 1) * (small ? 0.75 : 1) }]} numberOfLines={2}>
            📅 {sticker}
          </Text>
        </View>
      ) : null}
      {note ? (
        <View style={[styles.note, small && styles.noteSmall]}>
          <Text style={[styles.noteText, { fontSize: 17 * (small ? 0.7 : 1), lineHeight: 23 * (small ? 0.7 : 1) }]}>{note}</Text>
        </View>
      ) : null}
    </View>
  );

  if (photoUri) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.photoCard]}>
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={small ? 0 : 150}
          onLoad={onPhotoReady}
          onError={onPhotoReady}
        />
        <View style={[styles.photoOverlay, { padding: space.lg * k, paddingBottom: (small ? space.md : space.xxl * 3) }]}>
          {kicker && event ? <Kicker text={kicker} small={small} /> : null}
          {event ? (
            <Text style={[styles.photoTitle, { fontSize: 22 * (small ? 0.6 : 1) }]} numberOfLines={2}>
              {event.title}
            </Text>
          ) : null}
          {stickers}
        </View>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.card, { backgroundColor: t.tints[look.tint], padding: space.xl * k, paddingTop: small ? space.lg : 120, paddingBottom: small ? space.lg : 140 }]}>
      {kicker ? <Kicker text={kicker} small={small} /> : null}
      <View style={styles.middle}>
        {event?.posterUrl ? (
          <Image source={{ uri: event.posterUrl }} style={[styles.poster, { width: small ? '62%' : '68%', borderRadius: radius.lg * k }]} contentFit="cover" transition={small ? 0 : 150} />
        ) : (
          <View style={[styles.emoji, { width: 110 * k, height: 110 * k, borderRadius: 55 * k, backgroundColor: t.app }]}>
            <Text style={{ fontSize: 52 * k }}>{look.emoji}</Text>
          </View>
        )}
        {event ? (
          <Text style={[styles.title, { color: t.onTint, fontSize: 30 * (small ? 0.55 : 1), lineHeight: 34 * (small ? 0.55 : 1) }]} numberOfLines={3}>
            {event.title}
          </Text>
        ) : null}
        {stickers}
      </View>
    </View>
  );
}

function Kicker({ text, small }: { text: string; small: boolean }) {
  const t = useNiklTheme();
  return (
    <View style={[styles.kicker, { backgroundColor: t.accent }, small && styles.kickerSmall]}>
      <Text style={[styles.kickerText, { color: t.onAccent, fontSize: small ? 9 : 12 }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 } as const;

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  middle: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  poster: { aspectRatio: 4 / 5, ...shadow },
  emoji: { alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  kicker: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  kickerSmall: { paddingHorizontal: space.sm, paddingVertical: 3 },
  kickerText: { fontWeight: '800', letterSpacing: 1 },
  stickers: { alignItems: 'center', alignSelf: 'stretch' },
  sticker: { backgroundColor: '#FFFFFF', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, transform: [{ rotate: '-3deg' }], maxWidth: '100%', ...shadow },
  stickerSmall: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 4 },
  stickerText: { color: '#0E0F13', fontWeight: '700', textAlign: 'center' },
  note: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md, maxWidth: '100%' },
  noteSmall: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
  noteText: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
  photoCard: { backgroundColor: '#000000' },
  photoOverlay: { flex: 1, justifyContent: 'flex-end', gap: space.sm },
  photoTitle: { color: '#FFFFFF', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },
});
