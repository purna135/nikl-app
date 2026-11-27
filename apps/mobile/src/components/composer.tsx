import { useEffect, type ReactNode } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatEventWhen } from '@nikl/utils';
import { PosterTile } from '@/components/event-card';
import { Icon } from '@/components/social';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { placeLabel, type ExploreEvent } from '@/lib/explore';
import { isProfileComplete, useMyProfile } from '@/lib/profile';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

export function leaveComposer() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * The frame for "New post" and "Share your plans": ✕, a title, the form and a big button at the
 * bottom. ✕ asks before throwing away a draft.
 */
export function ComposerFrame({
  title,
  dirty,
  busy,
  children,
  footer,
}: {
  title: string;
  dirty: boolean;
  busy: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const t = useNiklTheme();
  const cancel = () => {
    if (busy) return;
    if (!dirty) return leaveComposer();
    Alert.alert('Throw away this draft?', 'What you’ve added so far won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Throw away', style: 'destructive', onPress: leaveComposer },
    ]);
  };
  // Android's back button asks too, instead of silently throwing the draft away.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (!dirty) return false;
      Alert.alert('Throw away this draft?', 'What you’ve added so far won’t be saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Throw away', style: 'destructive', onPress: leaveComposer },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [dirty, busy]);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: t.app }]}>
      <View style={[styles.topBar, { borderBottomColor: t.hair }]}>
        <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel" disabled={busy} style={styles.close}>
          <Icon name="close" color={t.ink} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: t.ink }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: t.hair }]}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Posting needs a login and a finished profile (a username). Otherwise this explains what to do. */
export function ComposerGate({ title, children }: { title: string; children: (userId: string) => ReactNode }) {
  const t = useNiklTheme();
  const { loading, session } = useAuth();
  const { profile, loading: profileLoading } = useMyProfile(session?.user.id);

  let body;
  if (loading || (session && profileLoading && !profile)) {
    body = <ActivityIndicator color={t.muted} style={{ marginTop: space.xxl }} />;
  } else if (!session) {
    body = (
      <>
        <EmptyState emoji="👋" title="Log in first" body="Use your phone number. We'll text you a 6-digit code, no password needed." />
        <Button label="Log in with your phone" onPress={() => router.push('/login')} />
      </>
    );
  } else if (!isProfileComplete(profile)) {
    body = (
      <>
        <EmptyState emoji="✍️" title="Set up your profile first" body="Add your name and a username, so people know who posted." />
        <Button label="Set up my profile" onPress={() => router.push('/profile-setup')} />
      </>
    );
  } else {
    return children(session.user.id);
  }
  return (
    <ComposerFrame title={title} dirty={false} busy={false} footer={null}>
      {body}
    </ComposerFrame>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const t = useNiklTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.ink }]} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** Pick one of your saved upcoming events (or none, when `allowNone`). */
export function EventChoice({
  events,
  selected,
  onSelect,
  allowNone,
  loading,
  empty,
}: {
  events: ExploreEvent[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  allowNone: boolean;
  loading: boolean;
  empty: string;
}) {
  const t = useNiklTheme();
  if (loading) return <ActivityIndicator color={t.muted} accessibilityLabel="Loading your saved events" />;
  const rows: { id: string | null; event: ExploreEvent | null }[] = [...(allowNone ? [{ id: null, event: null }] : []), ...events.map((e) => ({ id: e.event_id, event: e }))];
  return (
    <View accessibilityRole="radiogroup" style={styles.choices}>
      {rows.map(({ id, event }) => {
        const on = selected === id;
        return (
          <Pressable
            key={id ?? 'none'}
            onPress={() => onSelect(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={event ? `${event.title}, ${formatEventWhen(event.starts_at)}` : 'No event'}
            style={({ pressed }) => [styles.choice, { borderColor: on ? t.accent : t.line, backgroundColor: pressed ? t.surface2 : t.surface }]}>
            {event ? (
              <PosterTile posterUrl={event.poster_url} category={event.category} emojiSize={18} recyclingKey={event.event_id} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.noneThumb, { backgroundColor: t.surface2 }]}>
                <Text style={{ color: t.muted, fontSize: 18 }}>–</Text>
              </View>
            )}
            <View style={styles.choiceText}>
              <Text style={[styles.choiceTitle, { color: t.ink }]} numberOfLines={1}>
                {event ? event.title : 'No event'}
              </Text>
              {event ? (
                <Text style={[styles.choiceSub, { color: t.muted }]} numberOfLines={1}>
                  {[formatEventWhen(event.starts_at), placeLabel(event.venue_name, event.area)].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <View style={[styles.radio, { borderColor: on ? t.accent : t.line }]}>{on && <View style={[styles.radioDot, { backgroundColor: t.accent }]} />}</View>
          </Pressable>
        );
      })}
      {events.length === 0 && <Text style={[styles.hint, { color: t.muted }]}>{empty}</Text>}
    </View>
  );
}

/** Two or three side-by-side choices (e.g. Public / Friends). */
export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string; sub: string }[]; value: V; onChange: (v: V) => void }) {
  const t = useNiklTheme();
  return (
    <View style={[styles.seg, { backgroundColor: t.surface2 }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${o.label}. ${o.sub}`}
            style={[styles.segItem, on && { backgroundColor: t.app }]}>
            <Text style={[styles.segLabel, { color: on ? t.ink : t.muted }]}>{o.label}</Text>
            <Text style={[styles.segSub, { color: t.muted }]} numberOfLines={2}>
              {o.sub}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const composerStyles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingTop: space.sm + 2, paddingBottom: space.sm + 2, fontSize: fontSize.md + 1, textAlignVertical: 'top' },
  counter: { fontSize: fontSize.sm, alignSelf: 'flex-end' },
  error: { fontSize: fontSize.md },
  stage: { fontSize: fontSize.sm, textAlign: 'center' },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg + 1, fontWeight: '700' },
  content: { padding: space.lg, gap: space.xl },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  section: { gap: space.sm },
  sectionTitle: { fontSize: fontSize.md + 1, fontWeight: '700' },
  hint: { fontSize: fontSize.sm, lineHeight: 18 },
  choices: { gap: space.sm },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touchTarget + 12, padding: space.sm, borderWidth: 1.5, borderRadius: radius.md },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  noneThumb: { alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: fontSize.md, fontWeight: '600' },
  choiceSub: { fontSize: fontSize.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segItem: { flex: 1, minHeight: touchTarget + 8, borderRadius: radius.md - 3, paddingHorizontal: space.sm, paddingVertical: space.sm, justifyContent: 'center' },
  segLabel: { fontSize: fontSize.md, fontWeight: '700' },
  segSub: { fontSize: fontSize.xs + 0.5, marginTop: 1 },
});
