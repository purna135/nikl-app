import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, inTimeWindow, type TimeFilter } from '@nikl/utils';
import { EventCard } from '@/components/event-card';
import { EmptyState, Screen, T, Wordmark } from '@/components/ui';
import { useExploreEvents, type ExploreEvent } from '@/lib/explore';
import { radius, space, touchTarget, useNiklTheme } from '@/theme';

const MAX_CARDS = 12;

const SECTIONS = [
  { title: 'This weekend', when: 'weekend', seeAllLabel: 'See all events this weekend' },
  { title: 'Coming up', when: 'week', seeAllLabel: 'See all events in the next 7 days' },
] as const satisfies readonly { title: string; when: TimeFilter; seeAllLabel: string }[];

/** This weekend's events; if there are none, the next 7 days; otherwise nothing. */
function upcomingSection(rows: ExploreEvent[], now: Date | null) {
  if (!now) return null;
  for (const s of SECTIONS) {
    const events = rows.filter((e) => inTimeWindow(e.starts_at, e.ends_at, s.when, now));
    if (events.length > 0) return { ...s, events };
  }
  return null;
}

/** Home: what's on this weekend (or soon). Club posts and stories arrive in weeks 4–5. */
export default function HomeScreen() {
  const t = useNiklTheme();
  const { connected, loading, refreshing, error, rows, fetchedAt, refresh } = useExploreEvents();

  const section = upcomingSection(rows, fetchedAt);

  let feed;
  if (!connected) {
    feed = (
      <EmptyState
        emoji="🔌"
        title="Not connected yet"
        body="This copy of the app isn’t linked to Nikl’s server yet, so there are no events to show."
      />
    );
  } else if (loading) {
    feed = (
      <View style={styles.loading}>
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading events" />
      </View>
    );
  } else if (error && rows.length === 0) {
    feed = <EmptyState emoji="📡" title="Couldn’t load events" body={error} action={{ label: 'Try again', onPress: refresh }} />;
  } else if (section) {
    feed = (
      <View style={{ gap: space.md }}>
        <View style={styles.sectionHead}>
          <T variant="heading" accessibilityRole="header">
            {section.title}
          </T>
          <Pressable
            onPress={() => router.navigate({ pathname: '/explore', params: { when: section.when } })}
            accessibilityRole="button"
            accessibilityLabel={section.seeAllLabel}
            style={styles.seeAll}>
            <Text style={{ color: t.ink, fontWeight: '600' }}>See all</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          data={section.events.slice(0, MAX_CARDS)}
          keyExtractor={(e) => e.event_id}
          renderItem={({ item }) => <EventCard event={item} variant="compact" />}
          ItemSeparatorComponent={Gap}
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.bleedContent}
        />
      </View>
    );
  } else {
    feed = (
      <EmptyState
        emoji="🌱"
        title="Nothing on this week yet"
        body="Clubs around Bhubaneswar are adding plans. Pull down to refresh, or look further ahead in Explore."
        action={{ label: 'Open Explore', onPress: () => router.navigate('/explore') }}
      />
    );
  }

  return (
    <Screen
      refreshControl={connected ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} /> : undefined}>
      <Wordmark />
      <View style={{ gap: space.xs }}>
        <T variant="small" style={{ fontWeight: '700', letterSpacing: 1, color: t.accent }}>
          BHUBANESWAR
        </T>
        <T variant="title">What&apos;s the scene this weekend?</T>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={[styles.bleedContent, { gap: space.sm }]}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.navigate({ pathname: '/explore', params: { category: c.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${c.name} events`}
            style={({ pressed }) => [styles.chip, { backgroundColor: t.tints[c.tint], opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.chipEmoji}>{c.emoji}</Text>
            <Text style={[styles.chipText, { color: t.onTint }]}>{c.short}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {feed}
    </Screen>
  );
}

function Gap() {
  return <View style={{ width: space.md }} />;
}

const styles = StyleSheet.create({
  // Horizontal lists run edge to edge while their first item lines up with the page padding.
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  bleedContent: { paddingHorizontal: space.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, minHeight: touchTarget, borderRadius: radius.md },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { minHeight: touchTarget, minWidth: touchTarget, paddingHorizontal: space.sm, alignItems: 'flex-end', justifyContent: 'center' },
  loading: { height: 200, alignItems: 'center', justifyContent: 'center' },
});
