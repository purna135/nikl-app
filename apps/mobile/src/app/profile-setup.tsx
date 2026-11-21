import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BBSR_AREAS, CATEGORIES, type Area, type CategoryId } from '@nikl/utils';
import { profileSetupSchema } from '@nikl/validation';
import { Button, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { radius, space, touchTarget, useNiklTheme } from '@/theme';

const toUsername = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24);

/** First-time profile set-up: name, username, area, at least 3 interests, birth year (18+). */
export default function ProfileSetupScreen() {
  const t = useNiklTheme();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [area, setArea] = useState<Area | null>(null);
  const [interests, setInterests] = useState<CategoryId[]>([]);
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleInterest = (id: CategoryId) =>
    setInterests((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function save() {
    if (!supabase || !session) return;
    const parsed = profileSetupSchema.safeParse({
      name,
      username,
      area: area ?? undefined,
      interests,
      dobYear: Number.parseInt(birthYear, 10),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first?.path[0] === 'area' ? 'Pick the area you usually hang around.' : first?.path[0] === 'dobYear' && !birthYear ? 'Enter the year you were born.' : (first?.message ?? 'Check your details.'));
      return;
    }
    setBusy(true);
    setError(null);
    const p = parsed.data;
    const { error: rpcError } = await supabase.rpc('complete_profile', {
      p_name: p.name,
      p_username: p.username,
      p_area: p.area,
      p_interests: p.interests,
      p_dob_year: p.dobYear,
    });
    setBusy(false);
    if (rpcError) {
      setError(['22023', '23505'].includes(rpcError.code) ? rpcError.message : 'Something went wrong. Please try again.');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }

  const input = [styles.input, { borderColor: t.line, color: t.ink, backgroundColor: t.surface }];
  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? t.ink : t.surface2 }];
  const chipText = (on: boolean) => [styles.chipText, { color: on ? t.app : t.ink }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: space.xs }}>
          <T variant="title">Set up your profile</T>
          <T variant="muted">So friends can find you and we can show plans you&apos;ll like.</T>
        </View>

        <View style={styles.field}>
          <T style={styles.label}>Your name</T>
          <TextInput
            style={input}
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (!usernameTouched) setUsername(toUsername(v));
            }}
            placeholder="Riya Mohanty"
            placeholderTextColor={t.muted}
            autoComplete="name"
            textContentType="name"
            maxLength={60}
            accessibilityLabel="Your name"
          />
        </View>

        <View style={styles.field}>
          <T style={styles.label}>Username</T>
          <View style={[styles.prefixRow, { borderColor: t.line, backgroundColor: t.surface }]}>
            <Text style={[styles.prefix, { color: t.muted }]}>@</Text>
            <TextInput
              style={[styles.prefixInput, { color: t.ink }]}
              value={username}
              onChangeText={(v) => {
                setUsernameTouched(true);
                setUsername(v.toLowerCase());
              }}
              placeholder="riya.nikls"
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              accessibilityLabel="Username"
            />
          </View>
        </View>

        <View style={styles.field}>
          <T style={styles.label}>Area you usually hang around</T>
          <View style={styles.chips}>
            {BBSR_AREAS.map((a) => (
              <Pressable key={a} onPress={() => setArea(a)} style={chip(area === a)} accessibilityRole="radio" accessibilityState={{ checked: area === a }}>
                <Text style={chipText(area === a)}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <T style={styles.label}>
            What are you into? <T variant="small">(pick 3 or more)</T>
          </T>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const on = interests.includes(c.id);
              return (
                <Pressable key={c.id} onPress={() => toggleInterest(c.id)} style={chip(on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <Text style={chipText(on)}>
                    {c.emoji} {c.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <T style={styles.label}>Year you were born</T>
          <TextInput
            style={[input, styles.year]}
            value={birthYear}
            onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="2001"
            placeholderTextColor={t.muted}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Year you were born"
          />
          <T variant="small">Nikl is for people 18 and over. Only you can see this.</T>
        </View>

        {error && (
          <Text style={[styles.error, { color: t.like }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button label="Save and continue" onPress={save} busy={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: radius.md, height: 50, paddingHorizontal: space.md, fontSize: 16 },
  year: { width: 120 },
  prefixRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md },
  prefix: { paddingLeft: space.md, fontSize: 16, fontWeight: '600' },
  prefixInput: { flex: 1, height: 50, paddingHorizontal: space.sm, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: touchTarget - 6, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 14 },
});
