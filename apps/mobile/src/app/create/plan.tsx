import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ComposerFrame, ComposerGate, composerStyles, EventChoice, leaveComposer, Section } from '@/components/composer';
import { StoryCard, type StoryEvent } from '@/components/story-card';
import { Button } from '@/components/ui';
import { useExploreEvents, type ExploreEvent } from '@/lib/explore';
import { invalidate } from '@/lib/focus-data';
import { showFlash } from '@/lib/flash';
import { explainPickProblem, pickPhotos, removePhotos, uploadPhoto, type PickedPhoto } from '@/lib/media';
import { friendlyMessage, OFFLINE, useSavedEventIds, useSocial } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { fontSize, radius, space, useNiklTheme } from '@/theme';

const NOTE_MAX = 100;

function asStoryEvent(e: ExploreEvent): StoryEvent {
  return { title: e.title, category: e.category, posterUrl: e.poster_url, startsAt: e.starts_at, area: e.area, isFree: e.is_free, minPricePaise: e.min_price_paise };
}

/**
 * "Your plans": share an upcoming event you're going to as a 24-hour story, with an optional photo
 * and note. Opened from Home (+) or from an event ("Share to your plans", `event` = its id).
 */
export default function SharePlanScreen() {
  const { event } = useLocalSearchParams<{ event?: string }>();
  return <ComposerGate title="Share your plans">{(userId) => <PlanComposer userId={userId} initialEvent={event ?? null} />}</ComposerGate>;
}

function PlanComposer({ userId, initialEvent }: { userId: string; initialEvent: string | null }) {
  const t = useNiklTheme();
  const { width } = useWindowDimensions();
  const saves = useSavedEventIds();
  const explore = useExploreEvents();
  const social = useSocial();
  const [eventId, setEventId] = useState<string | null>(initialEvent);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Your saved upcoming events, plus the one you came from (you needn't save it to share it).
  const choices = explore.rows.filter(
    (e) => e.event_id === initialEvent || social.isSaved(e.event_id, saves.data?.has(e.event_id) ?? false, saves.fetchedAt),
  );
  const chosen = choices.find((e) => e.event_id === eventId) ?? null;
  const trimmed = note.trim();
  const reviewed = photo !== null || trimmed.length > 0;
  const previewWidth = Math.min(width * 0.5, 220);

  async function addPhoto() {
    const result = await pickPhotos(1);
    if (result.status !== 'picked') return explainPickProblem(result);
    setPhoto(result.photos[0] ?? null);
  }

  async function share() {
    if (!supabase || !chosen) return;
    const client = supabase;
    setBusy(true);
    setProblem(null);
    let path: string | null = null;
    if (photo) {
      try {
        path = await uploadPhoto(client, userId, photo);
      } catch {
        setBusy(false);
        setProblem('Couldn’t upload your photo. Check your internet connection and try again.');
        return;
      }
    }
    let failed: string | null = null;
    let storyId: string | null = null;
    try {
      const { data, error } = await client.rpc('create_user_story', {
        p_event_id: chosen.event_id,
        ...(path ? { p_media_path: path } : {}),
        ...(trimmed ? { p_note: trimmed } : {}),
      });
      if (error) failed = friendlyMessage(error);
      else storyId = data;
    } catch {
      failed = OFFLINE;
    }
    if (failed || !storyId) {
      await removePhotos(client, userId, [path]);
      setBusy(false);
      setProblem(failed ?? OFFLINE);
      return;
    }
    const { data: made } = await client.from('stories').select('moderation_status').eq('id', storyId).maybeSingle();
    invalidate('home:');
    showFlash(
      made?.moderation_status === 'approved' || !reviewed
        ? 'Added to your plans. It’s up for 24 hours.'
        : 'Added to your plans — your followers will see it once Nikl has checked your photo and note, usually within a few hours.',
    );
    leaveComposer();
  }

  const footer = (
    <>
      {problem && (
        <Text style={[composerStyles.error, { color: t.like }]} accessibilityLiveRegion="polite">
          {problem}
        </Text>
      )}
      <Button label={chosen ? 'Share to your plans' : 'Pick an event to share'} onPress={share} disabled={!chosen} busy={busy} />
    </>
  );

  return (
    <ComposerFrame title="Share your plans" dirty={chosen !== null && (reviewed || eventId !== initialEvent)} busy={busy} footer={footer}>
      <View
        style={[styles.preview, { width: previewWidth, height: (previewWidth * 16) / 9, backgroundColor: t.surface2 }]}
        accessible
        accessibilityLabel={chosen ? `Preview: you’re going to ${chosen.title}` : 'Preview. Pick an event first'}>
        {chosen ? (
          <StoryCard event={asStoryEvent(chosen)} kicker="Going" note={trimmed || null} photoUri={photo?.uri ?? null} small />
        ) : (
          <Text style={[styles.previewEmpty, { color: t.muted }]}>Pick an event below</Text>
        )}
      </View>

      <Section title="Which event are you going to?" hint="Your saved upcoming events. Your followers see it for 24 hours.">
        <EventChoice
          events={choices}
          selected={eventId}
          onSelect={setEventId}
          allowNone={false}
          loading={saves.loading || explore.loading}
          empty="Save an upcoming event (tap its bookmark) to share it here."
        />
      </Section>

      <Section title="Add a photo (optional)">
        <View style={styles.photoRow}>
          <View style={styles.grow}>
            <Button label={photo ? 'Change photo' : 'Choose a photo'} kind="secondary" onPress={addPhoto} disabled={busy} />
          </View>
          {photo && (
            <Pressable onPress={() => setPhoto(null)} disabled={busy} accessibilityRole="button" accessibilityLabel="Remove the photo" style={styles.link}>
              <Text style={[styles.linkText, { color: t.accent }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </Section>

      <Section title="Add a note (optional)">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Who’s coming? 🙌"
          placeholderTextColor={t.muted}
          maxLength={NOTE_MAX}
          editable={!busy}
          accessibilityLabel="Note"
          style={[composerStyles.input, { borderColor: t.line, color: t.ink, backgroundColor: t.surface }]}
        />
        <Text style={[composerStyles.counter, { color: t.muted }]} accessibilityLabel={`${NOTE_MAX - note.length} characters left`}>
          {note.length}/{NOTE_MAX}
        </Text>
      </Section>

      <Text style={[styles.info, { color: t.muted }]}>
        {reviewed
          ? 'With a photo or note, Nikl checks your story before your followers see it (usually within a few hours).'
          : 'Just the event card goes up straight away.'}
      </Text>
    </ComposerFrame>
  );
}

const styles = StyleSheet.create({
  preview: { alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { fontSize: fontSize.sm, textAlign: 'center', padding: space.md },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  link: { minHeight: 44, minWidth: 44, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: fontSize.md, fontWeight: '700' },
  info: { fontSize: fontSize.sm, lineHeight: 18 },
});
