import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatEventWhen } from '@nikl/utils';
import { categoryLook, placeLabel, priceLabel, type ExploreEvent } from '@/lib/explore';
import { fontSize, radius, space, useNiklTheme } from '@/theme';

/** The event's poster, or a soft category-coloured tile with its emoji when there is none. */
export function PosterTile({
  posterUrl,
  category,
  emojiSize = 30,
  contentFit = 'cover',
  recyclingKey,
  style,
}: {
  posterUrl: string | null;
  category: string;
  emojiSize?: number;
  contentFit?: 'cover' | 'contain';
  recyclingKey?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useNiklTheme();
  const look = categoryLook(category);
  return (
    <View
      style={[styles.poster, { backgroundColor: posterUrl ? t.surface2 : t.tints[look.tint] }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit={contentFit} transition={150} recyclingKey={recyclingKey} />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{look.emoji}</Text>
      )}
    </View>
  );
}

function openEvent(slug: string) {
  router.push({ pathname: '/event/[slug]', params: { slug } });
}

function cardLabel(e: ExploreEvent): string {
  const parts = [e.title, formatEventWhen(e.starts_at), placeLabel(e.venue_name, e.area), priceLabel(e), `by ${e.club_name}`];
  if (e.more_dates > 0) parts.push(`${e.more_dates} more ${e.more_dates === 1 ? 'date' : 'dates'}`);
  return parts.filter(Boolean).join(', ');
}

const moreDates = (n: number) => (n > 0 ? `+${n} more ${n === 1 ? 'date' : 'dates'}` : null);

/**
 * An event in a list. `row` (Explore) puts a small poster beside the details;
 * `compact` (Home's horizontal lists) is a narrow card with the poster on top.
 */
export function EventCard({ event: e, variant = 'row' }: { event: ExploreEvent; variant?: 'row' | 'compact' }) {
  const t = useNiklTheme();
  const place = placeLabel(e.venue_name, e.area);
  const more = moreDates(e.more_dates);

  const details = (
    <View style={[styles.details, variant === 'compact' && styles.compactDetails]}>
      <Text style={[styles.when, { color: t.muted }]} numberOfLines={1}>
        {formatEventWhen(e.starts_at)}
      </Text>
      <Text style={[styles.title, { color: t.ink }]} numberOfLines={2}>
        {e.title}
      </Text>
      {place ? (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {place}
        </Text>
      ) : null}
      {variant === 'row' && (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {e.club_name}
          {e.club_verified ? ' ✓' : ''}
        </Text>
      )}
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: t.ink }]}>{priceLabel(e)}</Text>
        {more && <Text style={[styles.meta, { color: t.muted }]}>· {more}</Text>}
      </View>
      {variant === 'compact' && (
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {e.club_name}
          {e.club_verified ? ' ✓' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={() => openEvent(e.slug)}
      accessibilityRole="button"
      accessibilityLabel={cardLabel(e)}
      accessibilityHint="Opens the event"
      style={({ pressed }) => [
        variant === 'row' ? styles.row : styles.compact,
        { backgroundColor: t.surface, borderColor: t.hair, opacity: pressed ? 0.85 : 1 },
      ]}>
      <PosterTile
        posterUrl={e.poster_url}
        category={e.category}
        recyclingKey={e.event_id}
        style={variant === 'row' ? styles.rowPoster : styles.compactPoster}
      />
      {details}
    </Pressable>
  );
}

export const COMPACT_CARD_WIDTH = 236;

const styles = StyleSheet.create({
  poster: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space.md, padding: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  rowPoster: { width: 92, height: 116, borderRadius: radius.md },
  compact: { width: COMPACT_CARD_WIDTH, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  compactPoster: { width: '100%', height: 140 },
  details: { flex: 1, gap: 3, paddingVertical: space.xs, paddingHorizontal: space.xs },
  compactDetails: { padding: space.md },
  when: { fontSize: fontSize.sm, fontWeight: '600' },
  title: { fontSize: fontSize.lg, fontWeight: '700', letterSpacing: -0.2 },
  meta: { fontSize: fontSize.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  price: { fontSize: fontSize.md, fontWeight: '700' },
});
