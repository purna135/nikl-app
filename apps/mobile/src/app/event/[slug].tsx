import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatEventWhen, formatPaise } from '@nikl/utils';
import { PosterTile } from '@/components/event-card';
import { openClub } from '@/components/feed';
import { IconButton, VerifiedTick } from '@/components/social';
import { Button, EmptyState, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { spotsLabel, upcomingDates, useEventDetail, type EventDate, type EventDetail } from '@/lib/event-detail';
import { categoryLook } from '@/lib/explore';
import { shareEvent, useSavedEventIds, useSocial } from '@/lib/social';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** One event: poster, dates and tickets, venue, save, share, and Book / RSVP. */
export default function EventScreen() {
  const t = useNiklTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { status, event, loadedAt, retry } = useEventDetail(slug);
  const saves = useSavedEventIds();
  const social = useSocial();
  const saved = event ? social.isSaved(event.id, saves.data?.has(event.id) ?? false, saves.fetchedAt) : false;

  let body;
  if (status === 'ready' && event && loadedAt) {
    body = <EventBody event={event} now={loadedAt} />;
  } else if (status === 'loading') {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading event" />
      </View>
    );
  } else {
    const message =
      status === 'offline'
        ? { emoji: '🔌', title: 'Not connected yet', body: 'This copy of the app isn’t linked to Nikl’s server yet.' }
        : status === 'error'
          ? { emoji: '📡', title: 'Couldn’t load this event', body: 'Check your internet connection and try again.' }
          : { emoji: '🔍', title: 'We couldn’t find this event', body: 'It may have finished, or the club took it down.' };
    body = (
      <View style={styles.pad}>
        <EmptyState
          {...message}
          action={status === 'error' ? { label: 'Try again', onPress: retry } : { label: 'Browse events', onPress: () => router.navigate('/explore') }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, { backgroundColor: t.surface2, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.backGlyph, { color: t.ink }]}>←</Text>
        </Pressable>
        {event && (
          <View style={[styles.round, { backgroundColor: t.surface2 }]}>
            <IconButton
              icon={saved ? 'bookmarkOn' : 'bookmark'}
              size={22}
              label="Save event"
              on={saved}
              onPress={() => social.setSave(event.id, !saved)}
            />
          </View>
        )}
      </View>
      {body}
    </SafeAreaView>
  );
}

function EventBody({ event, now }: { event: EventDetail; now: Date }) {
  const t = useNiklTheme();
  const { loading: authLoading, session } = useAuth();
  const look = categoryLook(event.category);
  const dates = upcomingDates(event, now);
  const venue = event.venues;
  const club = event.clubs;
  const hasPin = venue?.lat != null && venue?.lng != null;

  // "Your plans": share this event as a 24-hour story (needs a login, and an upcoming date).
  const shareToPlans = () => {
    if (authLoading) return;
    if (!session) router.push('/login');
    else router.push({ pathname: '/create/plan', params: { event: event.id } });
  };

  // Free events with free ticket types take an RSVP (a free booking); events without ticket types need nothing.
  const noTickets = dates.length > 0 && dates.every((d) => d.ticket_tiers.length === 0);
  const allFree = dates.every((d) => d.ticket_tiers.every((tier) => tier.price_paise === 0));
  const book = () => {
    if (authLoading) return;
    if (!session) router.push('/login');
    else router.push({ pathname: '/book/[slug]', params: { slug: event.slug } });
  };

  const openMaps = () => {
    if (!venue || venue.lat == null || venue.lng == null) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`).catch(() =>
      Alert.alert('Couldn’t open Maps', 'Try searching for the venue in your maps app.'),
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <PosterTile
          posterUrl={event.poster_url}
          category={event.category}
          contentFit="contain"
          emojiSize={64}
          style={[styles.poster, { aspectRatio: event.poster_url ? 4 / 5 : 16 / 9 }]}
        />

        <View style={{ gap: space.sm }}>
          <View style={[styles.tag, { backgroundColor: t.tints[look.tint] }]}>
            <Text style={[styles.tagText, { color: t.onTint }]}>
              {look.emoji} {look.name}
            </Text>
          </View>
          <T variant="title" accessibilityRole="header">
            {event.title}
          </T>
          {club && (
            <Pressable
              onPress={() => openClub(club.handle)}
              accessibilityRole="button"
              accessibilityLabel={`By ${club.name}${club.verified ? ', verified' : ''}`}
              accessibilityHint="Opens the club’s profile"
              style={({ pressed }) => [styles.clubRow, { opacity: pressed ? 0.7 : 1 }]}>
              <T variant="muted">
                by <Text style={{ color: t.ink, fontWeight: '600' }}>{club.name}</Text>
              </T>
              {club.verified && <VerifiedTick size={18} />}
              <Text style={[styles.chevron, { color: t.muted }]}>›</Text>
            </Pressable>
          )}
        </View>

        {event.description ? <T style={styles.description}>{event.description}</T> : null}

        <View style={styles.section}>
          <T variant="heading" accessibilityRole="header">
            {dates.length > 1 ? 'Upcoming dates' : 'When'}
          </T>
          {dates.length === 0 ? (
            <T variant="muted">No upcoming dates right now. Check back later.</T>
          ) : (
            dates.map((d) => <DateCard key={d.id} date={d} />)
          )}
        </View>

        <View style={styles.section}>
          <T variant="heading" accessibilityRole="header">
            Where
          </T>
          {venue ? (
            <View style={{ gap: 2 }}>
              <T style={{ fontWeight: '600' }}>{venue.name}</T>
              {venue.address ? <T variant="muted">{venue.address}</T> : null}
              {venue.area ? <T variant="muted">{venue.area}</T> : null}
            </View>
          ) : (
            <T variant="muted">The club will share the venue soon.</T>
          )}
          {hasPin && <Button label="Open in Maps" kind="secondary" onPress={openMaps} />}
        </View>

        <View style={styles.shareRow}>
          {dates.length > 0 && <Button label="Share to your plans" kind="secondary" onPress={shareToPlans} />}
          <Button label="Share" kind="secondary" onPress={() => shareEvent(event.title, event.slug)} />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: t.app, borderTopColor: t.hair }]}>
        {dates.length === 0 ? (
          <Button label="No upcoming dates" onPress={() => {}} disabled />
        ) : noTickets ? (
          <T variant="muted" style={styles.footerNote}>
            Free entry. No booking needed, just turn up.
          </T>
        ) : (
          <Button label={allFree ? 'RSVP' : 'Book'} onPress={book} />
        )}
      </SafeAreaView>
    </>
  );
}

function DateCard({ date }: { date: EventDate }) {
  const t = useNiklTheme();
  const spots = spotsLabel(date.capacity, date.seats_taken);
  return (
    <View style={[styles.dateCard, { borderColor: t.hair, backgroundColor: t.surface }]}>
      <View style={styles.dateHead}>
        <T style={{ fontWeight: '700', flex: 1 }}>{formatEventWhen(date.starts_at)}</T>
        {spots && <T variant="small" style={{ color: spots === 'Full' ? t.warn : t.muted, fontWeight: '600' }}>{spots}</T>}
      </View>
      {date.ticket_tiers.length === 0 ? (
        <T variant="muted">Free entry</T>
      ) : (
        date.ticket_tiers.map((tier) => {
          const soldOut = tier.quantity !== null && tier.sold >= tier.quantity;
          return (
            <View key={`${tier.position}-${tier.name}`} style={styles.tierRow}>
              <T variant="muted" style={{ flex: 1 }}>
                {tier.name}
              </T>
              <T style={{ fontWeight: '600', color: soldOut ? t.muted : t.ink }}>{soldOut ? 'Sold out' : formatPaise(tier.price_paise)}</T>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', justifyContent: 'space-between' },
  back: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  round: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, overflow: 'hidden' },
  backGlyph: { fontSize: 22, fontWeight: '600' },
  content: { padding: space.lg, paddingTop: space.xs, gap: space.xl },
  poster: { width: '100%', borderRadius: radius.lg },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 2 },
  tagText: { fontSize: fontSize.sm, fontWeight: '600' },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touchTarget, alignSelf: 'flex-start' },
  chevron: { fontSize: 22, marginTop: -2 },
  description: { lineHeight: 22 },
  section: { gap: space.md },
  shareRow: { gap: space.sm },
  dateCard: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  dateHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerNote: { textAlign: 'center', paddingVertical: space.sm },
  pad: { padding: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
