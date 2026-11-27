import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Sheet, SheetRow, SheetTitle } from '@/components/sheet';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { deleteMyPost, deleteMyStory, REPORT_DETAILS_MAX, REPORT_REASONS, reportContent, setBlock, type ReportReason } from '@/lib/safety';
import { fontSize, radius, space, touchTarget, useNiklTheme } from '@/theme';

/**
 * State for one ⋯ menu on a screen. Everything in it needs a login, so without one, opening it goes
 * to the login screen instead (before any sheet is shown, so two modals never overlap).
 */
export function useContentMenu() {
  const { loading, session } = useAuth();
  const [target, setTarget] = useState<MenuTarget | null>(null);
  const open = (next: MenuTarget) => {
    if (loading) return;
    if (!session) router.push('/login');
    else setTarget(next);
  };
  return { target, open, close: () => setTarget(null) };
}

/** What the ⋯ menu is about. `person` is the author when it's a person (they can be blocked). */
export type MenuTarget = {
  type: 'post' | 'story' | 'user' | 'club';
  id: string;
  mine: boolean;
  person: { id: string; handle: string } | null;
  /** Clubs and people: the name to show ("Report @priya"). */
  handle?: string;
  /** Stories: the photo to delete with it. */
  mediaPath?: string | null;
  /** People you already blocked (their profile): offer Unblock instead. */
  blocked?: boolean;
};

export type MenuOutcome = 'deleted' | 'blocked' | 'unblocked' | 'reported';

type Step = 'menu' | 'report' | 'thanks' | 'block' | 'delete';

const NOUN: Record<MenuTarget['type'], string> = { post: 'post', story: 'story', user: 'person', club: 'club' };

/**
 * The ⋯ menu for a post, story, person or club: Report (with reasons), Block / Unblock, or Delete
 * for your own. Confirmations happen inside the sheet. `onDone` runs after something changed.
 */
export function ContentMenu({ target, onClose, onDone }: { target: MenuTarget | null; onClose: () => void; onDone?: (outcome: MenuOutcome) => void }) {
  // Keep showing the last menu while the sheet fades out, instead of an empty sheet.
  const [last, setLast] = useState<MenuTarget | null>(target);
  const [opens, setOpens] = useState(0);
  if (target !== null && target !== last) {
    setLast(target);
    setOpens((n) => n + 1);
  }
  const shown = target ?? last;
  return (
    <Sheet visible={target !== null} onClose={onClose} label="More options">
      {/* Every opening starts again at the menu. */}
      {shown && <MenuBody key={opens} target={shown} onClose={onClose} onDone={onDone} />}
    </Sheet>
  );
}

function MenuBody({ target, onClose, onDone }: { target: MenuTarget; onClose: () => void; onDone?: (outcome: MenuOutcome) => void }) {
  const t = useNiklTheme();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const noun = NOUN[target.type];
  const name = target.handle ?? target.person?.handle;
  const person = target.person;

  const go = (next: Step) => {
    setProblem(null);
    setStep(next);
  };

  async function run(action: () => Promise<string | null>, outcome: MenuOutcome, after: 'close' | 'thanks') {
    setBusy(true);
    setProblem(null);
    const failed = await action();
    setBusy(false);
    if (failed) return setProblem(failed);
    onDone?.(outcome);
    if (after === 'thanks') setStep('thanks');
    else onClose();
  }

  const error = problem ? (
    <Text style={[styles.error, { color: t.like }]} accessibilityLiveRegion="polite">
      {problem}
    </Text>
  ) : null;

  if (step === 'report') {
    return (
      <>
        <SheetTitle body="Your report is private. Nikl won’t tell anyone who sent it.">{`Why are you reporting this ${noun}?`}</SheetTitle>
        <View accessibilityRole="radiogroup">
          {REPORT_REASONS.map((r) => {
            const on = reason === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setReason(r.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={r.hint ? `${r.label}. ${r.hint}` : r.label}
                style={({ pressed }) => [styles.reason, { backgroundColor: pressed ? t.surface2 : 'transparent' }]}>
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, { color: t.ink }]}>{r.label}</Text>
                  {r.hint ? <Text style={[styles.reasonHint, { color: t.muted }]}>{r.hint}</Text> : null}
                </View>
                <View style={[styles.radio, { borderColor: on ? t.accent : t.line }]}>{on && <View style={[styles.radioDot, { backgroundColor: t.accent }]} />}</View>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Anything else Nikl should know? (optional)"
          placeholderTextColor={t.muted}
          multiline
          maxLength={REPORT_DETAILS_MAX}
          accessibilityLabel="Anything else Nikl should know? Optional"
          style={[styles.input, { borderColor: t.line, color: t.ink, backgroundColor: t.app }]}
        />
        {error}
        <View style={styles.actions}>
          <Button
            label="Send report"
            onPress={() => reason && run(() => reportContent(target.type, target.id, reason, details), 'reported', 'thanks')}
            disabled={!reason}
            busy={busy}
          />
          <Button label="Cancel" kind="secondary" onPress={onClose} />
        </View>
      </>
    );
  }

  if (step === 'thanks') {
    return (
      <>
        <View style={styles.thanks} accessible accessibilityLiveRegion="polite">
          <View style={[styles.ok, { backgroundColor: t.surface2 }]}>
            <Text style={[styles.okGlyph, { color: t.ink }]}>✓</Text>
          </View>
          <Text style={[styles.thanksTitle, { color: t.ink }]}>Thanks — Nikl will take a look.</Text>
          <Text style={[styles.thanksBody, { color: t.muted }]}>We check reports by hand. If something breaks the community guidelines, we take it down.</Text>
        </View>
        <View style={styles.actions}>
          {person && !target.mine && !target.blocked && (
            <Button label={`Block @${person.handle}`} kind="secondary" onPress={() => setStep('block')} />
          )}
          <Button label="Done" kind="dark" onPress={onClose} />
        </View>
      </>
    );
  }

  if (step === 'block' && person) {
    return (
      <>
        <SheetTitle body="They won’t see your posts, stories or profile, and you won’t see theirs. You’ll both stop following each other. Nikl won’t tell them.">
          {`Block @${person.handle}?`}
        </SheetTitle>
        {error}
        <View style={styles.actions}>
          <DangerButton label="Block" busy={busy} onPress={() => run(() => setBlock(person.id, true), 'blocked', 'close')} />
          <Button label="Cancel" kind="secondary" onPress={onClose} />
        </View>
      </>
    );
  }

  if (step === 'delete' && userId) {
    const remove =
      target.type === 'story' ? () => deleteMyStory(userId, target.id, target.mediaPath ?? null) : () => deleteMyPost(userId, target.id);
    return (
      <>
        <SheetTitle body={target.type === 'story' ? 'It disappears for everyone straight away.' : 'Its photos are deleted too. This can’t be undone.'}>
          {`Delete this ${noun}?`}
        </SheetTitle>
        {error}
        <View style={styles.actions}>
          <DangerButton label="Delete" busy={busy} onPress={() => run(remove, 'deleted', 'close')} />
          <Button label="Cancel" kind="secondary" onPress={onClose} />
        </View>
      </>
    );
  }

  // The menu itself.
  const canDelete = target.mine && (target.type === 'post' || target.type === 'story');
  const canBlock = person !== null && !target.mine;
  return (
    <>
      {canDelete && <SheetRow emoji="🗑️" label={`Delete ${noun}`} danger onPress={() => go('delete')} />}
      {!target.mine && (
        <SheetRow
          emoji="🚩"
          label={target.type === 'user' || target.type === 'club' ? `Report ${name ? `@${name}` : noun}` : `Report ${noun}`}
          sub="Tell Nikl what’s wrong"
          onPress={() => go('report')}
        />
      )}
      {canBlock &&
        (target.blocked ? (
          <SheetRow
            emoji="🔓"
            label={`Unblock @${person.handle}`}
            sub="You’ll see each other’s posts again"
            onPress={() => run(() => setBlock(person.id, false), 'unblocked', 'close')}
          />
        ) : (
          <SheetRow emoji="⛔" label={`Block @${person.handle}`} sub="They won’t see you, and you won’t see them" danger onPress={() => go('block')} />
        ))}
      {busy && <ActivityIndicator color={t.muted} />}
      {error}
      <SheetRow label="Cancel" onPress={onClose} />
    </>
  );
}

function DangerButton({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) {
  const t = useNiklTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => [styles.danger, { backgroundColor: t.like, opacity: pressed ? 0.85 : 1 }]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dangerText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touchTarget + 4, paddingHorizontal: space.sm, borderRadius: radius.md },
  reasonText: { flex: 1, paddingVertical: space.sm },
  reasonLabel: { fontSize: fontSize.md + 1, fontWeight: '600' },
  reasonHint: { fontSize: fontSize.sm, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 72, paddingHorizontal: space.md, paddingTop: space.sm + 2, paddingBottom: space.sm, fontSize: fontSize.md + 1, textAlignVertical: 'top', marginTop: space.sm },
  actions: { gap: space.sm, marginTop: space.md },
  error: { fontSize: fontSize.md, marginTop: space.sm },
  thanks: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  ok: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  okGlyph: { fontSize: 24, fontWeight: '800' },
  thanksTitle: { fontSize: fontSize.lg + 1, fontWeight: '700', textAlign: 'center' },
  thanksBody: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 20 },
  danger: { minHeight: touchTarget + 4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: '600' },
});
