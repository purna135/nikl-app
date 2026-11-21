"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneOtp, verifyPhoneOtp } from "@nikl/supabase";
import { formatIndianPhone } from "@nikl/utils";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

type Step = "phone" | "code";

/** Where to go after login: only a path on this site (blocks tricks like "//x.com" or "/\x.com"). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.includes("\\")) return "/account";
  try {
    const url = new URL(next, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/account";
  } catch {
    return "/account";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabaseConfigured) {
    return (
      <div className="card">
        <h1>Almost there</h1>
        <p>
          Login isn&apos;t connected to a database yet. Copy the web values from <code>.env.example</code> into{" "}
          <code>apps/web/.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const result = await sendPhoneOtp(supabase, phoneInput);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setPhone(result.phone);
    setCode("");
    setStep("code");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(supabase, phone, code);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
  }

  if (step === "phone") {
    return (
      <form className="card" onSubmit={onSendCode} noValidate>
        <h1>Log in to Nikl</h1>
        <p>We&apos;ll text you a 6-digit code. No password needed.</p>
        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <div className="phone-input">
            <span aria-hidden="true">+91</span>
            <input
              id="phone"
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "phone-error" : undefined}
              required
            />
          </div>
        </div>
        {error && (
          <p className="error" id="phone-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary block" type="submit" disabled={busy || phoneInput.trim().length < 10}>
          {busy ? "Sending…" : "Send code"}
        </button>
        <p className="hint">By continuing you confirm you&apos;re 18 or older. Standard SMS rates may apply.</p>
      </form>
    );
  }

  return (
    <form className="card" onSubmit={onVerify} noValidate>
      <h1>Enter the code</h1>
      <p>
        Sent to <strong>{formatIndianPhone(phone)}</strong>.{" "}
        <button type="button" className="link" onClick={() => { setStep("phone"); setError(null); }}>
          Change number
        </button>
      </p>
      <div className="field">
        <label htmlFor="code">6-digit code</label>
        <input
          id="code"
          className="input otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "code-error" : undefined}
          autoFocus
        />
      </div>
      {error && (
        <p className="error" id="code-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary block" type="submit" disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : "Log in"}
      </button>
      <button type="button" className="link" onClick={onSendCode} disabled={busy}>
        Send a new code
      </button>
    </form>
  );
}
