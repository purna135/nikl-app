// Payments for bookings (DEV_PLAN §5.1, DECISIONS.md P25–P26, T30).
//
// The pay page sends the booking's pay token (no login needed, like a payment link):
//   POST { action: "start", token }                       → { mode: "mock" | "razorpay", orderId, keyId?, amount, currency }
//   POST { action: "verify", token, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//                                                         → { status }  (checkout's success handler)
//   POST { action: "mock_pay", token, outcome }           → { status }  (local "mock" mode only)
// Razorpay calls the same URL with a webhook (header X-Razorpay-Signature): payment.captured,
// order.paid and payment.failed. Every path is safe to repeat; the database makes the final call.
//
// Settings (Supabase secrets, or supabase/functions/.env locally; never in git):
//   PAYMENTS_MODE=mock|razorpay   (mock: no money moves, local development only; unset = payments off)
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET   (razorpay mode)
// This function runs without Supabase login checks (verify_jwt = false in config.toml): the pay
// token and Razorpay's signatures are what prove a request is genuine.

import { createClient } from "npm:@supabase/supabase-js@2.119.0";

// Unset means off: pretend payments must never be the default on a real server (they'd give free tickets).
const RAW_MODE = Deno.env.get("PAYMENTS_MODE");
const MODE: "mock" | "razorpay" | "off" = RAW_MODE === "razorpay" ? "razorpay" : RAW_MODE === "mock" ? "mock" : "off";
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, message: string, status = 200) => json({ error, message }, status);

const TOKEN_RE = /^[0-9a-f]{36}$/;
const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so signatures can't be guessed byte by byte. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Friendly database messages (22023) go to the payer; anything else is logged and kept vague. */
function dbProblem(error: { code?: string; message?: string }) {
  if (error.code === "22023" && error.message) return fail("booking", error.message);
  console.error("payments db error:", error.code, error.message);
  return fail("server", "Something went wrong on our side. Please try again in a minute.", 500);
}

async function bookingByToken(token: string) {
  const { data, error } = await admin.rpc("booking_for_payment", { p_token: token });
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

async function createRazorpayOrder(bookingId: string, amount: number, title: string): Promise<string> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`, "Content-Type": "application/json" },
    // receipt: max 40 chars and unique per order; a retry with the same receipt is refused, so add the time.
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `bk_${bookingId.replaceAll("-", "").slice(0, 24)}_${Date.now().toString(36)}`,
      notes: { booking_id: bookingId, event: title.slice(0, 200) },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.id !== "string") {
    console.error("razorpay order failed:", res.status, body?.error?.description);
    throw new Error("order_failed");
  }
  return body.id;
}

async function start(token: string) {
  const booking = await bookingByToken(token);
  if (!booking) return fail("not_found", "This payment link doesn't work any more.");
  if (booking.status === "confirmed" || booking.status === "late_paid") return json({ status: "confirmed" });
  if (MODE === "off" || (MODE === "razorpay" && (!KEY_ID || !KEY_SECRET))) return fail("not_configured", "Payments aren't switched on yet.");

  // Reuse the open order for a retry, so one booking has one order.
  const { data: openOrder } = await admin.rpc("open_order_for", { p_token: token });
  let orderId = typeof openOrder === "string" ? openOrder : null;
  if (!orderId) {
    orderId = MODE === "mock" ? `order_mock_${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}` : await createRazorpayOrder(booking.booking_id, booking.total_paise, booking.event_title);
  }
  const { data, error } = await admin.rpc("start_payment", { p_token: token, p_provider: MODE, p_order_id: orderId });
  if (error) return dbProblem(error);
  const row = (data ?? [])[0];
  return json({
    mode: MODE,
    orderId,
    keyId: MODE === "razorpay" ? KEY_ID : undefined,
    amount: row?.amount_paise ?? booking.total_paise,
    currency: "INR",
    title: booking.event_title,
  });
}

async function verify(token: string, orderId: string, paymentId: string, signature: string) {
  if (MODE !== "razorpay") return fail("mode", "Not in Razorpay mode.");
  // The webhook may have confirmed it already.
  const current = await bookingByToken(token);
  if (current?.status === "confirmed" || current?.status === "late_paid") return json({ status: "confirmed" });
  // Use the order we created for this booking, never one sent by the browser.
  const { data: ours } = await admin.rpc("open_order_for", { p_token: token });
  if (typeof ours !== "string" || ours !== orderId) return fail("order", "That payment doesn't match this booking.");
  const expected = await hmacHex(KEY_SECRET, `${ours}|${paymentId}`);
  if (!sameText(expected, signature)) return fail("signature", "We couldn't confirm that payment. If money left your account, it will be refunded.");
  const booking = await bookingByToken(token);
  const { data, error } = await admin.rpc("payment_captured", {
    p_order_id: ours,
    p_payment_id: paymentId,
    p_method: null,
    p_amount: booking?.total_paise ?? 0,
  });
  if (error) return dbProblem(error);
  return json({ status: data });
}

async function mockPay(token: string, outcome: string) {
  if (MODE !== "mock") return fail("mode", "Pretend payments are switched off.");
  const current = await bookingByToken(token);
  if (current?.status === "confirmed" || current?.status === "late_paid") return json({ status: "confirmed" });
  const { data: orderId } = await admin.rpc("open_order_for", { p_token: token });
  if (typeof orderId !== "string") return fail("order", "Start the payment first.");
  const booking = await bookingByToken(token);
  if (outcome === "failure") {
    const { data, error } = await admin.rpc("payment_failed", { p_order_id: orderId, p_payment_id: `pay_mock_fail_${Date.now()}` });
    if (error) return dbProblem(error);
    return json({ status: data });
  }
  const { data, error } = await admin.rpc("payment_captured", {
    p_order_id: orderId,
    p_payment_id: `pay_mock_${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`,
    p_method: "mock",
    p_amount: booking?.total_paise ?? 0,
  });
  if (error) return dbProblem(error);
  return json({ status: data });
}

async function webhook(req: Request, rawBody: string) {
  if (!WEBHOOK_SECRET) return new Response("not configured", { status: 503 });
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacHex(WEBHOOK_SECRET, rawBody);
  if (!sameText(expected, signature)) return new Response("bad signature", { status: 400 });

  const event = JSON.parse(rawBody);
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload?.payment?.entity?.id ?? ""}`;
  const { data: firstTime } = await admin.rpc("claim_payment_event", { p_event_id: eventId, p_event_type: String(event.event) });
  if (firstTime === false) return new Response("ok (seen)", { status: 200 });

  const payment = event.payload?.payment?.entity;
  // Keep only what reconciliation needs; never card or bank details.
  const raw = payment
    ? { event: event.event, id: payment.id, order_id: payment.order_id, amount: payment.amount, status: payment.status, method: payment.method, created_at: payment.created_at }
    : { event: event.event };
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id) {
    const { error } = await admin.rpc("payment_captured", {
      p_order_id: payment.order_id,
      p_payment_id: payment.id,
      p_method: payment.method ?? null,
      p_amount: payment.amount,
      p_raw: raw,
    });
    if (error && error.code !== "22023") return new Response("retry", { status: 500 });
    // Unknown order or wrong amount: acknowledged so Razorpay stops retrying, but logged loudly so a person
    // can check it (money may have been taken without tickets). Reconciliation picks these up too.
    if (error) console.error("PAYMENT NEEDS A LOOK:", error.message, { order: payment.order_id, payment: payment.id, amount: payment.amount });
  } else if (event.event === "payment.failed" && payment?.order_id) {
    const { error } = await admin.rpc("payment_failed", { p_order_id: payment.order_id, p_payment_id: payment.id, p_raw: raw });
    if (error) return new Response("retry", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("method", "Use POST.", 405);

  const rawBody = await req.text();
  if (req.headers.has("x-razorpay-signature")) return webhook(req, rawBody);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail("bad_request", "Couldn't read that request.", 400);
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!TOKEN_RE.test(token)) return fail("not_found", "This payment link doesn't work any more.");

  try {
    switch (body.action) {
      case "start":
        return await start(token);
      case "verify":
        return await verify(token, String(body.razorpay_order_id ?? ""), String(body.razorpay_payment_id ?? ""), String(body.razorpay_signature ?? ""));
      case "mock_pay":
        return await mockPay(token, String(body.outcome ?? "success"));
      default:
        return fail("bad_request", "Unknown action.", 400);
    }
  } catch (e) {
    console.error("payments error:", e instanceof Error ? e.message : e);
    return fail("server", "Something went wrong on our side. Please try again in a minute.", 500);
  }
});
