import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES, TIME_FILTERS, categoryById, inTimeWindow, stackBySpot, type CategoryId, type TimeFilter } from '@nikl/utils';
import { FilterChip } from '@/components/chip';
import { EventCard } from '@/components/event-card';
import { EventsMap, type MapPoint } from '@/components/events-map';
import { EmptyState, T } from '@/components/ui';
import { matchesQuery, useExploreEvents } from '@/lib/explore';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

const parseCategory = (raw?: string): CategoryId | null => (raw && categoryById(raw) ? (raw as CategoryId) : null);
const parseWhen = (raw?: string): TimeFilter => TIME_FILTERS.find((f) => f.id === raw)?.id ?? 'any';

/**
 * Explore: everything on in the next 60 days, with search and filters.
 * Opens on the map (DECISIONS.md D4) in Nikl's own builds; Expo Go has no native map, so it shows the list.
 * Links can preselect filters: /explore?category=music or /explore?when=weekend.
 */
export default function ExploreScreen() {
  const t = useNiklTheme();
  const params = useLocalSearchParams<{ category?: string; when?: string }>();
  const { connected, loading, refreshing, error, rows, fetchedAt, refresh } = useExploreEvents();

  const [query, setQuery] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [category, setCategory] = useState(() => parseCategory(params.category));
  const [when, setWhen] = useState(() => parseWhen(params.when));
  const [view, setView] = useState<'map' | 'list'>(EventsMap ? 'map' : 'list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Follow new links from Home even when this tab is already open.
  const [seen, setSeen] = useState({ category: params.category, when: params.when });
  if (seen.category !== params.category || seen.when !== params.when) {
    if (seen.category !== params.category) setCategory(parseCategory(params.category));
    if (seen.when !== params.when) setWhen(parseWhen(params.when));
    setSeen({ category: params.category, when: params.when });
  }

  const pickCategory = (id: CategoryId) => {
    const next = category === id ? null : id;
    setCategory(next);
    router.setParams({ category: next ?? undefined });
  };
  const pickWhen = (id: TimeFilter) => {
    setWhen(id);
    router.setParams({ when: id === 'any' ? undefined : id });
  };
  const clearFilters = () => {
    setQuery('');
    setFreeOnly(false);
    setCategory(null);
    setWhen('any');
    router.setParams({ category: undefined, when: undefined });
  };

  const filtered = useMemo(
    () =>
      rows.filter(
        (e) =>
          (!category || e.category === category) &&
          (!freeOnly || e.is_free || e.min_price_paise === 0) &&
          (when === 'any' || (fetchedAt !== null && inTimeWindow(e.starts_at, e.ends_at, when, fetchedAt))) &&
          matchesQuery(e, query),
      ),
    [rows, category, freeOnly, when, fetchedAt, query],
  );
  const filtering = Boolean(category || freeOnly || when !== 'any' || query.trim());

  // Pins for events with a venue pin; events at the same spot get fanned out.
  const points: MapPoint[] = useMemo(
    () =>
      stackBySpot(
        filtered.flatMap((e) =>
          e.lat != null && e.lng != null ? [{ id: e.event_id, lat: e.lat, lng: e.lng, category: e.category, title: e.title }] : [],
        ),
      ),
    [filtered],
  );
  const selected = selectedId ? filtered.find((e) => e.event_id === selectedId) ?? null : null;
  const noPin = filtered.length - points.length;

  let body;
  if (!connected) {
    body = (
      <View style={styles.pad}>
        <EmptyState
          emoji="🔌"
          title="Not connected yet"
          body="This copy of the app isn’t linked to Nikl’s server yet, so there are no events to show."
        />
      </View>
    );
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading events" />
      </View>
    );
  } else if (error && rows.length === 0) {
    body = (
      <View style={styles.pad}>
        <EmptyState emoji="📡" title="Couldn’t load events" body={error} action={{ label: 'Try again', onPress: refresh }} />
      </View>
    );
  } else if (view === 'map' && EventsMap) {
    body = (
      <View style={styles.mapArea}>
        <EventsMap points={points} selectedId={selected ? selected.event_id : null} onSelect={setSelectedId} />
        <View style={styles.mapTop} pointerEvents="box-none">
          <View style={[styles.mapPill, { backgroundColor: t.surface }]}>
            <T variant="small" accessibilityLiveRegion="polite" style={error ? { color: t.warn } : undefined}>
              {error
                ? 'Couldn’t refresh. Showing the last list.'
                : rows.length === 0
                  ? 'Nothing on in the next 60 days'
                  : filtered.length === 0
                    ? 'No events match'
                    : `${filtered.length} ${filtered.length === 1 ? 'event' : 'events'}${noPin > 0 ? ` · ${noPin} only in the list` : ''}`}
            </T>
          </View>
          <Pressable
            onPress={refresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh events"
            style={[styles.mapPill, styles.mapRefresh, { backgroundColor: t.surface }]}>
            {refreshing ? <ActivityIndicator size="small" color={t.muted} /> : <Text style={{ color: t.ink, fontSize: fontSize.lg }}>↻</Text>}
          </Pressable>
        </View>
        {selected ? (
          <View style={[styles.mapCard, styles.mapCardWithClose, { backgroundColor: t.surface, borderColor: t.line }]}>
            <EventCard event={selected} />
            <Pressable
              onPress={() => setSelectedId(null)}
              accessibilityRole="button"
              accessibilityLabel="Close event card"
              style={styles.mapCardClose}>
              <Text style={{ color: t.muted, fontSize: fontSize.lg }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          filtered.length === 0 &&
          rows.length > 0 && (
            <View style={[styles.mapCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <EmptyState emoji="🔍" title="No matches" body="Try fewer filters or another word." action={{ label: 'Clear filters', onPress: clearFilters }} />
            </View>
          )
        )}
      </View>
    );
  } else {
    body = (
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.event_id}
        renderItem={({ item }) => <EventCard event={item} />}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} />}
        ListHeaderComponent={
          <View style={{ gap: space.xs, marginBottom: space.sm }}>
            {filtered.length > 0 && (
              <T variant="small">
                {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
                {filtering ? '' : ' in the next 60 days'}
              </T>
            )}
            {error && (
              <T variant="small" style={{ color: t.warn }} accessibilityLiveRegion="polite">
                {error}
              </T>
            )}
          </View>
        }
        ListEmptyComponent={
          rows.length === 0 ? (
            <EmptyState emoji="🌱" title="Nothing on yet" body="No events in the next 60 days. Clubs are adding plans, so check back soon." />
          ) : (
            <EmptyState
              emoji="🔍"
              title="No matches"
              body="Nothing fits those filters right now. Try fewer filters or another word."
              action={{ label: 'Clear filters', onPress: clearFilters }}
            />
          )
        }
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <T variant="title">Explore</T>
          {EventsMap && (
            <View style={[styles.seg, { backgroundColor: t.surface2 }]} accessibilityRole="radiogroup" accessibilityLabel="View">
              {(['map', 'list'] as const).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setView(v)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: view === v }}
                  style={[styles.segBtn, view === v && { backgroundColor: t.surface }]}>
                  <Text style={{ color: view === v ? t.ink : t.muted, fontWeight: '600', fontSize: fontSize.md }}>{v === 'map' ? 'Map' : 'List'}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={[styles.search, { borderColor: t.line, backgroundColor: t.surface }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, clubs, places"
            placeholderTextColor={t.muted}
            style={[styles.searchInput, { color: t.ink }]}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search events, clubs and places"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}>
              <Text style={{ color: t.muted, fontSize: fontSize.lg }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {TIME_FILTERS.map((f) => (
          <FilterChip key={f.id} label={f.label} selected={when === f.id} onPress={() => pickWhen(f.id)} />
        ))}
        <View style={[styles.divider, { backgroundColor: t.line }]} />
        <FilterChip label="Free" selected={freeOnly} onPress={() => setFreeOnly((v) => !v)} accessibilityLabel="Free events only" />
        <View style={[styles.divider, { backgroundColor: t.line }]} />
        {CATEGORIES.map((c) => (
          <FilterChip key={c.id} label={c.short} emoji={c.emoji} selected={category === c.id} onPress={() => pickCategory(c.id)} accessibilityLabel={c.name} />
        ))}
      </ScrollView>

      {body}
    </SafeAreaView>
  );
}

function Gap() {
  return <View style={{ height: space.md }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segBtn: { minHeight: touchTarget - 6, paddingHorizontal: space.lg, borderRadius: radius.md - 3, alignItems: 'center', justifyContent: 'center' },
  mapArea: { flex: 1, overflow: 'hidden' },
  mapTop: { position: 'absolute', top: space.md, left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  mapPill: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.xs, flexShrink: 1 },
  mapRefresh: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mapCard: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.sm,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  },
  // Leaves room for the close button so the card's text never runs under it.
  mapCardWithClose: { paddingRight: touchTarget },
  mapCardClose: { position: 'absolute', top: 0, right: 0, width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md },
  searchInput: { flex: 1, height: touchTarget + 4, paddingHorizontal: space.md, fontSize: fontSize.lg },
  clear: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: 'center' },
  divider: { width: 1, height: 22, marginHorizontal: space.xs },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
