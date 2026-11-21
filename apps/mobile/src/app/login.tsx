import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendPhoneOtp, verifyPhoneOtp } from '@nikl/supabase';
import { formatIndianPhone } from '@nikl/utils';
import { Button, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { radius, space, touchTarget, useNiklTheme } from '@/theme';

/** Phone OTP login, shown as a modal. Uses the same helpers as the web app. */
export default function LoginScreen() {
  const t = useNiklTheme();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const result = await sendPhoneOtp(supabase, phoneInput);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setPhone(result.phone);
    setCode('');
    setStep('code');
  }

  async function verify() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(supabase, phone, code);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.back();
  }

  const inputStyle = [styles.input, { borderColor: t.line, color: t.ink, backgroundColor: t.surface }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.close}>
          <Text style={{ color: t.muted, fontSize: 15 }}>Cancel</Text>
        </Pressable>

        {step === 'phone' ? (
          <View style={styles.form}>
            <T variant="title">Log in to Nikl</T>
            <T variant="muted">We&apos;ll text you a 6-digit code. No password needed.</T>
            <View style={[styles.phoneRow, { borderColor: t.line, backgroundColor: t.surface }]}>
              <Text style={[styles.prefix, { color: t.muted, borderRightColor: t.hair }]}>+91</Text>
              <TextInput
                style={[styles.phoneInput, { color: t.ink }]}
                placeholder="98765 43210"
                placeholderTextColor={t.muted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                value={phoneInput}
                onChangeText={setPhoneInput}
                accessibilityLabel="Mobile number"
                autoFocus
              />
            </View>
            {error && <Text style={[styles.error, { color: t.like }]} accessibilityLiveRegion="polite">{error}</Text>}
            <Button label="Send code" onPress={sendCode} busy={busy} disabled={phoneInput.replace(/\D/g, '').length < 10} />
            <T variant="small">By continuing you confirm you&apos;re 18 or older.</T>
          </View>
        ) : (
          <View style={styles.form}>
            <T variant="title">Enter the code</T>
            <T variant="muted">Sent to {formatIndianPhone(phone)}</T>
            <TextInput
              style={[inputStyle, styles.otp]}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              accessibilityLabel="6-digit code"
              autoFocus
            />
            {error && <Text style={[styles.error, { color: t.like }]} accessibilityLiveRegion="polite">{error}</Text>}
            <Button label="Log in" onPress={verify} busy={busy} disabled={code.length !== 6} />
            <View style={styles.links}>
              <Pressable onPress={() => { setStep('phone'); setError(null); }} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>Change number</Text>
              </Pressable>
              <Pressable onPress={sendCode} disabled={busy} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>Send a new code</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-end', minHeight: touchTarget, justifyContent: 'center' },
  form: { gap: space.md },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  prefix: { paddingHorizontal: space.md, fontSize: 16, fontWeight: '600', borderRightWidth: 1, alignSelf: 'stretch', textAlignVertical: 'center', paddingTop: 14 },
  phoneInput: { flex: 1, height: 52, paddingHorizontal: space.md, fontSize: 17 },
  input: { borderWidth: 1, borderRadius: radius.md, height: 56, paddingHorizontal: space.md },
  otp: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  error: { fontSize: 14 },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
