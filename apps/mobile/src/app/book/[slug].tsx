import { useCallback, useMemo, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCountdown, formatEventWhen, formatPaise, stepQuantity, tierAvailability, type TierAvailability } from '@nikl/utils';
import { Button, EmptyState, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  BookingError,
  fetchMyBookings,
  holdBooking,
  openPayPage,
  PAYMENTS_OFF,
  paymentsConfigured,
  useNow,
  useQuote,
  type MyBooking,
  type Selection,
} from '@/lib/booking';
import { upcomingDates, useEventDetail, type EventDate, type EventDetail } from '@/lib/event-detail';
import { invalidate, useFocusData } from '@/lib/focus-data';
import { showFlash } from '@/lib/flash';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

type Tier = EventDate['ticket_tiers'][number];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function goToTickets() {
  invalidate('bookings:');
  router.navigate('/tickets');
}

/** Pick a date and tickets, see the price, then RSVP (free) or pay on the website (paid). */
export default function BookScreen() {
  const t = useNiklTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { status, event, loadedAt, retry } = useEventDetail(slug);
  const { loading: authLoading, session } = useAuth();

  let body;
  if (!authLoading && !session) {
    body = (
      <EmptyState emoji="🎟️" title="Log in to book" body="Your tickets are saved to your account." action={{ label: 'Log in', onPress: () => router.push('/login') }} />
    );
  } else if (status === 'ready' && event && loadedAt && session) {
    body = <Booking event={event} now={loadedAt} userId={session.user.id} />;
  } else if (status === 'loading' || authLoading) {
    body = <ActivityIndicator color={t.muted} accessibilityLabel="Loading" style={{ marginTop: space.xl }} />;
  } else {
    body = (
      <EmptyState
        emoji="📡"
        title="Couldn’t load this event"
        body="Check your internet connection and try again."
        action={status === 'error' ? { label: 'Try again', onPress: retry } : undefined}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: t.app }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.round, { backgroundColor: t.surface2, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.glyph, { color: t.ink }]}>✕</Text>
        </Pressable>
        <T variant="heading" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">
          {event?.title ?? 'Tickets'}
        </T>
      </View>
      {body}
    </SafeAreaView>
  );
}

function Booking({ event, now, userId }: { event: EventDetail; now: Date; userId: string }) {
  const t = useNiklTheme();
  const dates = useMemo(() => upcomingDates(event, now), [event, now]);
  const [dateId, setDateId] = useState(dates[0]?.id ?? null);
  const date = dates.find((d) => d.id === dateId) ?? dates[0] ?? null;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [promoText, setPromoText] = useState('');
  const [promo, setPromo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(false);
  const attempt = useRef<{ sig: string; key: string } | null>(null);

  // A live unpaid hold for this event (from an earlier try) can be paid instead of starting over.
  const loadBookings = useCallback(() => fetchMyBookings(), []);
  const bookings = useFocusData(`bookings:${userId}`, loadBookings);
  const clock = useNow(true);
  const liveHold = bookings.data?.find(
    (b) => b.event_id === event.id && b.pay_token && b.hold_expires_at && new Date(b.hold_expires_at).getTime() > clock.getTime(),
  );

  const tiers = date?.ticket_tiers ?? [];
  const items: Selection = tiers.filter((tier) => (qty[tier.id] ?? 0) > 0).map((tier) => ({ tier_id: tier.id, qty: qty[tier.id] }));
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const quote = useQuote(date?.id ?? null, items, promo);
  const free = quote.quote ? quote.quote.total_paise === 0 : tiers.every((tier) => tier.price_paise === 0);

  if (going) {
    return (
      <View style={styles.pad}>
        <EmptyState emoji="🎉" title="You’re going!" body="Your ticket is in the Tickets tab." action={{ label: 'See your tickets', onPress: goToTickets }} />
      </View>
    );
  }
  if (!date) {
    return (
      <View style={styles.pad}>
        <EmptyState emoji="📅" title="No upcoming dates" body="Check back later." />
      </View>
    );
  }

  const pickDate = (id: string) => {
    setDateId(id);
    setQty({});
    setError(null);
  };

  const step = (tier: Tier, delta: 1 | -1, max: number) => {
    const current = qty[tier.id] ?? 0;
    setQty({ ...qty, [tier.id]: stepQuantity(current, delta, max, count - current) });
    setError(null);
  };

  /** After the pay page closes: see whether the payment went through. */
  const afterPayment = async (bookingId: string) => {
    invalidate('bookings:');
    let latest: MyBooking[] | null = null;
    try {
      latest = await fetchMyBookings();
    } catch {
      // Fall through to the "check Tickets" message.
    }
    const b = latest?.find((x) => x.booking_id === bookingId);
    await bookings.refresh();
    if (b && b.tickets.length > 0) {
      showFlash('Paid. You’re going! 🎉');
      goToTickets();
    } else if (b?.pay_token) {
      setError('Payment isn’t finished yet. Your tickets stay on hold for a few minutes, so you can finish paying.');
    } else if (!b) {
      setError('Couldn’t check your payment. Look in the Tickets tab in a moment.');
    } else {
      setError('This hold has run out. Pick your tickets again.');
    }
  };

  const pay = async (b: { booking_id: string; pay_token: string | null }) => {
    if (!b.pay_token) return;
    setBusy(true);
    setError(null);
    try {
      await openPayPage(b.pay_token);
      await afterPayment(b.booking_id);
    } catch (e) {
      setError(e instanceof BookingError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const book = async () => {
    if (busy || count === 0) return;
    if (!free && !paymentsConfigured) {
      setError(PAYMENTS_OFF);
      return;
    }
    // One key per selection, so a double tap (or a retry after a dropped connection) books once.
    const sig = JSON.stringify([date.id, items, promo]);
    if (attempt.current?.sig !== sig) attempt.current = { sig, key: randomUUID() };
    setBusy(true);
    setError(null);
    try {
      const hold = await holdBooking(date.id, items, promo, attempt.current.key);
      if (hold.status === 'confirmed') {
        invalidate('bookings:');
        setGoing(true);
        return;
      }
      await openPayPage(hold.pay_token ?? '');
      await afterPayment(hold.booking_id);
    } catch (e) {
      setError(e instanceof BookingError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const applyPromo = () => {
    const code = promoText.trim().toUpperCase();
    setPromo(code || null);
    setError(null);
  };

  const promoOn = promo !== null && promo === promoText.trim().toUpperCase();
  const removePromo = () => {
    setPromo(null);
    setPromoText('');
  };

  const mainLabel = free ? 'RSVP' : quote.quote ? `Pay ${formatPaise(quote.quote.total_paise)}` : 'Pay';

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {liveHold && (
          <View style={[styles.card, { borderColor: t.accent, backgroundColor: t.surface }]}>
            <T style={{ fontWeight: '700' }}>You have tickets on hold</T>
            <T variant="muted">
              {liveHold.items.map((i) => `${i.qty} × ${i.name}`).join(', ')} · {formatPaise(liveHold.total_paise)} ·{' '}
              {formatCountdown(liveHold.hold_expires_at ?? clock, clock)} left
            </T>
            <Button label="Finish paying" onPress={() => pay(liveHold)} busy={busy} />
          </View>
        )}

        {dates.length > 1 && (
          <View style={styles.section}>
            <T variant="heading" accessibilityRole="header">
              Date
            </T>
            {dates.map((d) => {
              const on = d.id === date.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => pickDate(d.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on, checked: on }}
                  style={[styles.choice, { borderColor: on ? t.ink : t.hair, backgroundColor: t.surface }]}>
                  <T style={{ fontWeight: on ? '700' : '400' }}>{formatEventWhen(d.starts_at)}</T>
                </Pressable>
              );
            })}
          </View>
        )}
        {dates.length === 1 && <T variant="muted">{formatEventWhen(date.starts_at)}</T>}

        <View style={styles.section}>
          <T variant="heading" accessibilityRole="header">
            Tickets
          </T>
          {tiers.length === 0 && <T variant="muted">No tickets needed for this one. Just turn up!</T>}
          {tiers.map((tier) => (
            <TierRow key={tier.id} tier={tier} qty={qty[tier.id] ?? 0} avail={tierAvailability(tier, clock)} full={count >= 10} onStep={step} />
          ))}
          {count >= 10 && <T variant="small">Up to 10 tickets per booking.</T>}
        </View>

        {tiers.some((tier) => tier.price_paise > 0) && (
          <View style={styles.section}>
            <T variant="heading" accessibilityRole="header">
              Promo code
            </T>
            <View style={styles.promoRow}>
              <TextInput
                value={promoText}
                onChangeText={setPromoText}
                placeholder="Code"
                placeholderTextColor={t.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={40}
                onSubmitEditing={applyPromo}
                accessibilityLabel="Promo code"
                style={[styles.input, { borderColor: t.line, color: t.ink, backgroundColor: t.surface }]}
              />
              <View style={{ width: 110 }}>
                <Button label={promoOn ? 'Remove' : 'Apply'} kind="secondary" onPress={promoOn ? removePromo : applyPromo} />
              </View>
            </View>
          </View>
        )}

        {count > 0 && (
          <View style={[styles.card, { borderColor: t.hair, backgroundColor: t.surface }]} accessibilityLiveRegion="polite">
            {quote.loading && !quote.quote ? (
              <ActivityIndicator color={t.muted} accessibilityLabel="Working out the price" />
            ) : quote.error ? (
              <T style={{ color: t.warn }}>{quote.error}</T>
            ) : quote.quote ? (
              <>
                <Line label="Tickets" value={formatPaise(quote.quote.subtotal_paise)} />
                {quote.quote.discount_paise > 0 && <Line label={`Code ${promo ?? ''}`} value={`− ${formatPaise(quote.quote.discount_paise, { zeroAsFree: false })}`} />}
                {quote.quote.fee_paise > 0 && <Line label="Booking fee" value={formatPaise(quote.quote.fee_paise, { zeroAsFree: false })} />}
                <View style={[styles.rule, { backgroundColor: t.hair }]} />
                <Line label="Total" value={formatPaise(quote.quote.total_paise)} strong />
              </>
            ) : null}
          </View>
        )}

        {error && (
          <T style={{ color: t.warn }} accessibilityLiveRegion="assertive">
            {error}
          </T>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: t.app, borderTopColor: t.hair }]}>
        <Button label={mainLabel} onPress={book} busy={busy} disabled={count === 0 || Boolean(quote.error) || quote.loading} />
      </SafeAreaView>
    </>
  );
}

function TierRow({
  tier,
  qty,
  avail,
  full,
  onStep,
}: {
  tier: Tier;
  qty: number;
  avail: TierAvailability;
  full: boolean;
  onStep: (tier: Tier, delta: 1 | -1, max: number) => void;
}) {
  const t = useNiklTheme();
  const off = avail.state !== 'on_sale';
  const note =
    avail.state === 'sold_out'
      ? 'Sold out'
      : avail.state === 'not_yet'
        ? 'Not on sale yet'
        : avail.state === 'ended'
          ? 'Sales closed'
          : avail.left !== null && avail.left <= 10
            ? `${avail.left} left`
            : null;
  const canAdd = !off && qty < avail.max && !full;
  return (
    <View style={[styles.tier, { borderColor: t.hair, backgroundColor: t.surface, opacity: off ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '600' }}>{tier.name}</T>
        <T variant="muted">
          {formatPaise(tier.price_paise)}
          {tier.seats_per_ticket > 1 ? ` · admits ${tier.seats_per_ticket}` : ''}
        </T>
        {note && <T variant="small" style={{ color: avail.state === 'on_sale' ? t.muted : t.warn }}>{note}</T>}
      </View>
      {!off && (
        <View style={styles.stepper}>
          <StepButton glyph="−" label={`One less ${tier.name}`} disabled={qty === 0} onPress={() => onStep(tier, -1, avail.max)} />
          <Text style={[styles.qty, { color: t.ink }]} accessibilityLabel={`${qty} ${tier.name}`}>
            {qty}
          </Text>
          <StepButton glyph="+" label={`One more ${tier.name}`} disabled={!canAdd} onPress={() => onStep(tier, 1, avail.max)} />
        </View>
      )}
    </View>
  );
}

function StepButton({ glyph, label, disabled, onPress }: { glyph: string; label: string; disabled: boolean; onPress: () => void }) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.step, { backgroundColor: t.surface2, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}>
      <Text style={[styles.stepGlyph, { color: t.ink }]}>{glyph}</Text>
    </Pressable>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <T variant={strong ? 'body' : 'muted'} style={[{ flex: 1 }, strong && { fontWeight: '700' }]}>
        {label}
      </T>
      <T variant={strong ? 'body' : 'muted'} style={strong && { fontWeight: '700' }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  round: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 18, fontWeight: '600' },
  content: { padding: space.lg, paddingTop: space.xs, gap: space.xl },
  pad: { padding: space.lg },
  section: { gap: space.md },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  choice: { borderWidth: 1.5, borderRadius: radius.md, minHeight: touchTarget + 4, paddingHorizontal: space.md, justifyContent: 'center' },
  tier: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.lg, padding: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, fontWeight: '600' },
  qty: { minWidth: 24, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700' },
  promoRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: touchTarget + 4, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: fontSize.md + 1 },
  line: { flexDirection: 'row', alignItems: 'center' },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: space.xs },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
