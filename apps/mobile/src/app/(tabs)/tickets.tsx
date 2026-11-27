import { useCallback, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { bookingSection, formatCountdown, formatEventWhen, formatPaise } from '@nikl/utils';
import { PosterTile } from '@/components/event-card';
import { Button, EmptyState, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { BookingError, cancelHold, fetchMyBookings, openPayPage, useNow, type MyBooking } from '@/lib/booking';
import { placeLabel } from '@/lib/explore';
import { useFocusData } from '@/lib/focus-data';
import { showFlash } from '@/lib/flash';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

function openEvent(slug: string) {
  router.push({ pathname: '/event/[slug]', params: { slug } });
}

const itemsLabel = (b: MyBooking) => b.items.map((i) => `${i.qty} × ${i.name}`).join(', ');

const OTHER_STATUS: Record<string, string> = {
  late_paid: 'Paid after the hold ran out. Your refund is on its way.',
  cancel_requested: 'Cancellation requested.',
  refunded: 'Refunded.',
};

/** Ticket wallet: unpaid holds, upcoming tickets with their codes, and past events. */
export default function TicketsScreen() {
  const t = useNiklTheme();
  const { loading: authLoading, session } = useAuth();
  const load = useCallback(() => fetchMyBookings(), []);
  const bookings = useFocusData(session ? `bookings:${session.user.id}` : null, load);
  const rows = bookings.data ?? [];
  const now = useNow(rows.some((b) => b.pay_token));

  if (!authLoading && !session) {
    return (
      <Screen>
        <T variant="title">Tickets</T>
        <EmptyState
          emoji="🎟️"
          title="Your tickets live here"
          body="Log in to book events and keep your tickets in one place."
          action={{ label: 'Log in with your phone', onPress: () => router.push('/login') }}
        />
      </Screen>
    );
  }

  const sections = { in_progress: [] as MyBooking[], upcoming: [] as MyBooking[], past: [] as MyBooking[], other: [] as MyBooking[] };
  for (const b of rows) {
    const section = bookingSection({ ...b, ticket_count: b.tickets.length }, now);
    if (section === 'in_progress' && b.hold_expires_at && new Date(b.hold_expires_at).getTime() <= now.getTime()) continue;
    sections[section].push(b);
  }
  sections.past.reverse();
  const nothing = rows.length === 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={bookings.refreshing} onRefresh={bookings.refresh} tintColor={t.muted} />}>
      <T variant="title">Tickets</T>
      {bookings.loading ? (
        <ActivityIndicator color={t.muted} accessibilityLabel="Loading your tickets" />
      ) : bookings.failed && nothing ? (
        <EmptyState emoji="📡" title="Couldn’t load your tickets" body="Check your internet connection and try again." action={{ label: 'Try again', onPress: bookings.refresh }} />
      ) : nothing ? (
        <EmptyState
          emoji="🎟️"
          title="No tickets yet"
          body="Events you book or RSVP to show up here."
          action={{ label: 'Find something to do', onPress: () => router.navigate('/explore') }}
        />
      ) : (
        <>
          {sections.in_progress.length > 0 && (
            <Section title="In progress">
              {sections.in_progress.map((b) => (
                <HoldCard key={b.booking_id} booking={b} now={now} onChange={bookings.refresh} />
              ))}
            </Section>
          )}
          <Section title="Upcoming">
            {sections.upcoming.length === 0 ? (
              <T variant="muted">Nothing booked yet. Your next plan shows up here.</T>
            ) : (
              <>
                {sections.upcoming.map((b) => <TicketCard key={b.booking_id} booking={b} />)}
                <T variant="small">Show this code at the entry. A QR code is coming soon.</T>
              </>
            )}
          </Section>
          {sections.other.length > 0 && (
            <Section title="Refunds and cancellations">
              {sections.other.map((b) => (
                <CompactRow key={b.booking_id} booking={b} note={OTHER_STATUS[b.status] ?? null} />
              ))}
            </Section>
          )}
          {sections.past.length > 0 && (
            <Section title="Past">
              {sections.past.map((b) => (
                <CompactRow key={b.booking_id} booking={b} note={b.status === 'checked_in' ? 'Checked in' : null} />
              ))}
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="heading" accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

function EventLine({ booking: b }: { booking: MyBooking }) {
  const t = useNiklTheme();
  const place = placeLabel(b.venue_name, b.area);
  return (
    <Pressable
      onPress={() => openEvent(b.event_slug)}
      accessibilityRole="button"
      accessibilityLabel={[b.event_title, formatEventWhen(b.starts_at), place].filter(Boolean).join(', ')}
      accessibilityHint="Opens the event"
      style={({ pressed }) => [styles.eventLine, { opacity: pressed ? 0.8 : 1 }]}>
      <PosterTile posterUrl={b.poster_url} category={b.category} recyclingKey={b.event_id} style={styles.poster} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.when, { color: t.muted }]}>{formatEventWhen(b.starts_at)}</Text>
        <Text style={[styles.title, { color: t.ink }]} numberOfLines={2}>
          {b.event_title}
        </Text>
        {place ? <Text style={[styles.meta, { color: t.muted }]}>{place}</Text> : null}
        <Text style={[styles.meta, { color: t.muted }]}>{b.club_name}</Text>
      </View>
    </Pressable>
  );
}

function HoldCard({ booking: b, now, onChange }: { booking: MyBooking; now: Date; onChange: () => Promise<void> }) {
  const t = useNiklTheme();
  const [busy, setBusy] = useState<'pay' | 'cancel' | null>(null);

  const pay = async () => {
    if (!b.pay_token) return;
    setBusy('pay');
    try {
      await openPayPage(b.pay_token);
    } catch (e) {
      Alert.alert('Couldn’t open payment', e instanceof BookingError ? e.message : 'Try again.');
    }
    await onChange();
    setBusy(null);
  };

  const cancel = () =>
    Alert.alert('Cancel this booking?', 'Your tickets go back on sale.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          try {
            await cancelHold(b.booking_id);
            showFlash('Booking cancelled');
          } catch (e) {
            Alert.alert('Couldn’t cancel', e instanceof BookingError ? e.message : 'Try again.');
          }
          await onChange();
          setBusy(null);
        },
      },
    ]);

  const left = b.hold_expires_at ? formatCountdown(b.hold_expires_at, now) : null;
  return (
    <View style={[styles.card, { borderColor: t.accent, backgroundColor: t.surface }]}>
      <EventLine booking={b} />
      <T variant="muted">
        {itemsLabel(b)} · {formatPaise(b.total_paise)}
      </T>
      {left && (
        <T style={{ fontWeight: '600' }} accessibilityLabel={`Held for ${left} more minutes`}>
          {b.status === 'failed' ? 'Payment didn’t go through. ' : ''}Held for {left}
        </T>
      )}
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" kind="secondary" onPress={cancel} busy={busy === 'cancel'} disabled={busy === 'pay'} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button label="Finish paying" onPress={pay} busy={busy === 'pay'} disabled={busy === 'cancel'} />
        </View>
      </View>
    </View>
  );
}

function TicketCard({ booking: b }: { booking: MyBooking }) {
  const t = useNiklTheme();
  return (
    <View style={[styles.card, { borderColor: t.hair, backgroundColor: t.surface }]}>
      <EventLine booking={b} />
      {b.items.length > 0 && <T variant="muted">{itemsLabel(b)}</T>}
      {b.tickets.map((tk) => {
        const used = tk.status !== 'valid';
        const label = tk.status === 'used' || b.status === 'checked_in' ? 'Checked in' : used ? 'Not valid' : null;
        return (
          <View
            key={tk.code}
            style={[styles.ticket, { backgroundColor: t.surface2 }]}
            accessible
            accessibilityLabel={`Ticket code ${tk.code.split('').join(' ')}${tk.admits > 1 ? `, admits ${tk.admits}` : ''}${label ? `, ${label}` : ''}`}>
            <Text style={[styles.code, { color: used ? t.muted : t.ink }]} selectable>
              {tk.code}
            </Text>
            <View style={styles.ticketMeta}>
              {tk.admits > 1 && <T variant="small">admits {tk.admits}</T>}
              {label && <T variant="small" style={{ fontWeight: '600' }}>{label}</T>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CompactRow({ booking: b, note }: { booking: MyBooking; note: string | null }) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={() => openEvent(b.event_slug)}
      accessibilityRole="button"
      accessibilityLabel={[b.event_title, formatEventWhen(b.starts_at), note].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.compact, { borderColor: t.hair, opacity: pressed ? 0.8 : 1 }]}>
      <PosterTile posterUrl={b.poster_url} category={b.category} recyclingKey={b.event_id} emojiSize={20} style={styles.smallPoster} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.meta, { color: t.ink, fontWeight: '600' }]} numberOfLines={1}>
          {b.event_title}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={2}>
          {formatEventWhen(b.starts_at)}
          {note ? ` · ${note}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.md },
  eventLine: { flexDirection: 'row', gap: space.md, minHeight: touchTarget },
  poster: { width: 64, height: 80, borderRadius: radius.md },
  smallPoster: { width: 44, height: 44, borderRadius: radius.sm },
  when: { fontSize: fontSize.sm, fontWeight: '600' },
  title: { fontSize: fontSize.lg, fontWeight: '700', letterSpacing: -0.2 },
  meta: { fontSize: fontSize.sm },
  buttons: { flexDirection: 'row', gap: space.sm },
  ticket: { borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.md, alignItems: 'center', gap: space.xs },
  code: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 30, fontWeight: '700', letterSpacing: 4 },
  ticketMeta: { flexDirection: 'row', gap: space.md },
  compact: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: space.sm, minHeight: touchTarget },
});
