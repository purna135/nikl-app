import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { otpSchema, phoneSchema } from '@nikl/validation';
import type { Database } from './database.types';

export type { Database };
export type NiklClient = SupabaseClient<Database>;

export interface SupabaseEnv {
  url?: string;
  publishableKey?: string;
}

/** True when both public values are present and aren't the .env.example placeholders. */
export function isConfigured(env: SupabaseEnv): env is Required<SupabaseEnv> {
  return Boolean(env.url && env.publishableKey && !env.publishableKey.startsWith('replace-'));
}

type ClientOptions = Parameters<typeof createClient>[2];

/**
 * One factory for both apps. The web app uses @supabase/ssr (cookie storage) instead; mobile passes
 * expo-sqlite localStorage. Only the public publishable key is used here; row-level security protects data.
 */
export function createNiklClient(env: Required<SupabaseEnv>, options?: ClientOptions): NiklClient {
  return createClient<Database>(env.url, env.publishableKey, options);
}

export type AuthResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Turns Supabase/Auth errors into short, plain messages people can act on. */
export function friendlyAuthError(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  const msg = (error?.message ?? '').toLowerCase();
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
    return 'That code didn’t work. Check the SMS or ask for a new code.';
  }
  if (msg.includes('sms') && (msg.includes('provider') || msg.includes('disabled') || msg.includes('unsupported'))) {
    return 'Text messages aren’t set up yet on this server. Use a test number (see README).';
  }
  if (msg.includes('fetch') || msg.includes('network')) {
    return 'Couldn’t reach Nikl. Check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/** Step 1 of login: send a 6-digit code by SMS. Returns the normalised phone number to use in step 2. */
export async function sendPhoneOtp(client: NiklClient, rawPhone: string): Promise<AuthResult<{ phone: string }>> {
  const parsed = phoneSchema.safeParse(rawPhone);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the number.' };
  try {
    const { error } = await client.auth.signInWithOtp({ phone: parsed.data, options: { channel: 'sms' } });
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true, phone: parsed.data };
  } catch (e) {
    return { ok: false, message: friendlyAuthError(e as Error) };
  }
}

/** Step 2 of login: check the code. On success Supabase stores the session for us. */
export async function verifyPhoneOtp(client: NiklClient, phone: string, rawCode: string): Promise<AuthResult> {
  const code = otpSchema.safeParse(rawCode);
  if (!code.success) return { ok: false, message: code.error.issues[0]?.message ?? 'Check the code.' };
  try {
    const { error } = await client.auth.verifyOtp({ phone, token: code.data, type: 'sms' });
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: friendlyAuthError(e as Error) };
  }
}
