import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ComposerFrame, ComposerGate, composerStyles, EventChoice, Section, Segmented } from '@/components/composer';
import { Button } from '@/components/ui';
import { useExploreEvents } from '@/lib/explore';
import { invalidate } from '@/lib/focus-data';
import { showFlash } from '@/lib/flash';
import { explainPickProblem, pickPhotos, removePhotos, uploadPhoto, type PickedPhoto } from '@/lib/media';
import { friendlyMessage, OFFLINE, useSavedEventIds, useSocial } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

const MAX_PHOTOS = 5;
const CAPTION_MAX = 2200;

type Audience = 'public' | 'friends';

/** New post: 1–5 photos, a caption, an optional event you saved, and who can see it. */
export default function NewPostScreen() {
  return <ComposerGate title="New post">{(userId) => <PostComposer userId={userId} />}</ComposerGate>;
}

function PostComposer({ userId }: { userId: string }) {
  const t = useNiklTheme();
  const { width } = useWindowDimensions();
  const saves = useSavedEventIds();
  const explore = useExploreEvents();
  const social = useSocial();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [current, setCurrent] = useState(0);
  const [caption, setCaption] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('public');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Only events you saved can be tagged (DECISIONS.md P7; booked events join in week 6).
  const saved = explore.rows.filter((e) => social.isSaved(e.event_id, saves.data?.has(e.event_id) ?? false, saves.fetchedAt));
  const shown = photos[Math.min(current, photos.length - 1)];
  const dirty = photos.length > 0 || caption.trim().length > 0;

  async function addPhotos() {
    const result = await pickPhotos(MAX_PHOTOS - photos.length);
    if (result.status !== 'picked') return explainPickProblem(result);
    setPhotos((list) => [...list, ...result.photos].slice(0, MAX_PHOTOS));
    setCurrent(photos.length);
    setProblem(null);
  }

  function removePhoto(i: number) {
    setPhotos((list) => list.filter((_, j) => j !== i));
    setCurrent((c) => Math.max(0, c >= i ? c - 1 : c));
  }

  async function post() {
    if (!supabase || photos.length === 0) return;
    const client = supabase;
    setBusy(true);
    setProblem(null);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        setStage(photos.length === 1 ? 'Uploading your photo…' : `Uploading photo ${i + 1} of ${photos.length}…`);
        uploaded.push(await uploadPhoto(client, userId, photos[i]!));
      }
    } catch {
      await removePhotos(client, userId, uploaded);
      setBusy(false);
      setStage(null);
      setProblem('Couldn’t upload your photos. Check your internet connection and try again.');
      return;
    }

    setStage('Posting…');
    let failed: string | null = null;
    let postId: string | null = null;
    try {
      const { data, error } = await client.rpc('create_user_post', {
        p_media_paths: uploaded,
        p_visibility: audience,
        ...(caption.trim() ? { p_caption: caption.trim() } : {}),
        ...(eventId ? { p_event_id: eventId } : {}),
      });
      if (error) failed = friendlyMessage(error);
      else postId = data;
    } catch {
      failed = OFFLINE;
    }
    if (failed || !postId) {
      await removePhotos(client, userId, uploaded);
      setBusy(false);
      setStage(null);
      setProblem(failed ?? OFFLINE);
      return;
    }

    // While Nikl reviews new posts (moderation switch on "review") it starts as pending.
    const { data: made } = await client.from('posts').select('moderation_status').eq('id', postId).maybeSingle();
    invalidate('home:', 'user:');
    showFlash(made?.moderation_status === 'approved' ? 'Posted.' : 'Posted — it’ll appear for others once Nikl has checked it, usually within a few hours.');
    router.dismissTo('/');
  }

  const footer = (
    <>
      {stage && <Text style={[composerStyles.stage, { color: t.muted }]}>{stage}</Text>}
      {problem && (
        <Text style={[composerStyles.error, { color: t.like }]} accessibilityLiveRegion="polite">
          {problem}
        </Text>
      )}
      <Button label={photos.length === 0 ? 'Add a photo to post' : 'Post'} onPress={post} disabled={photos.length === 0} busy={busy} />
    </>
  );

  return (
    <ComposerFrame title="New post" dirty={dirty} busy={busy} footer={footer}>
      {shown ? (
        <View>
          <Image source={{ uri: shown.uri }} style={[styles.preview, { borderRadius: radius.lg }]} contentFit="cover" accessibilityLabel={`Photo ${current + 1} of ${photos.length}`} />
          <Pressable
            onPress={() => removePhoto(Math.min(current, photos.length - 1))}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Remove this photo"
            style={styles.remove}>
            <View style={styles.removeDot}>
              <Text style={styles.removeGlyph}>✕</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={addPhotos}
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          accessibilityHint="Opens your gallery. Pick up to 5 photos"
          style={({ pressed }) => [styles.empty, { borderColor: t.line, backgroundColor: pressed ? t.surface2 : t.surface, height: Math.min(width - space.lg * 2, 360) }]}>
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={[styles.emptyTitle, { color: t.ink }]}>Add photos</Text>
          <Text style={[styles.emptyBody, { color: t.muted }]}>Up to 5 from your gallery</Text>
        </Pressable>
      )}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roll}>
          {photos.map((p, i) => (
            <Pressable
              key={`${i}-${p.uri}`}
              onPress={() => setCurrent(i)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${i + 1}`}
              accessibilityState={{ selected: i === current }}
              style={[styles.thumb, { borderColor: i === current ? t.accent : 'transparent' }]}>
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable
              onPress={addPhotos}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Add more photos"
              style={[styles.thumb, styles.addThumb, { backgroundColor: t.surface2 }]}>
              <Text style={[styles.addGlyph, { color: t.muted }]}>+</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <Section title="Caption">
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="How was it? Say something about the vibe"
          placeholderTextColor={t.muted}
          multiline
          maxLength={CAPTION_MAX}
          editable={!busy}
          accessibilityLabel="Caption"
          style={[composerStyles.input, styles.caption, { borderColor: t.line, color: t.ink, backgroundColor: t.surface }]}
        />
        {caption.length > CAPTION_MAX - 200 && (
          <Text style={[composerStyles.counter, { color: t.muted }]}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        )}
      </Section>

      <Section title="Tag an event" hint="Only events you saved can be tagged. People can book it from your post.">
        <EventChoice
          events={saved}
          selected={eventId}
          onSelect={setEventId}
          allowNone
          loading={saves.loading || explore.loading}
          empty="Save an event (tap its bookmark) to tag it here."
        />
      </Section>

      <Section title="Who can see this">
        <Segmented<Audience>
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'public', label: 'Public', sub: 'Your followers and your profile' },
            { value: 'friends', label: 'Friends', sub: 'People who follow you and you follow back' },
          ]}
        />
      </Section>

      <Text style={[styles.note, { color: t.muted }]}>
        Nikl checks new posts before others see them. Posts that break the community guidelines are removed.
      </Text>
    </ComposerFrame>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 4 / 5 },
  remove: { position: 'absolute', top: 0, right: 0, width: touchTarget + 8, height: touchTarget + 8, alignItems: 'center', justifyContent: 'center' },
  removeDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeGlyph: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  emptyBody: { fontSize: fontSize.md },
  roll: { gap: space.sm, marginTop: -space.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 2.5, overflow: 'hidden' },
  addThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  addGlyph: { fontSize: 28, fontWeight: '500' },
  caption: { minHeight: 96 },
  note: { fontSize: fontSize.sm, lineHeight: 18 },
});
