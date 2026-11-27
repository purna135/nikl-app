import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PayView } from "./pay-view";

export const metadata: Metadata = { title: "Pay for your booking", robots: { index: false, follow: false } };

/**
 * The pay page (DECISIONS.md P25; the money steps are in the "payments" server function, T30): opened from the website's booking page or from the app, with the
 * booking's random pay token in the address, so no login is needed here (like a payment link).
 */
export default function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ return?: string }> }) {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap pay-page">
        <Suspense fallback={<div className="skeleton" style={{ height: 320, borderRadius: 18 }} />}>
          <Pay params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Pay({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ return?: string }> }) {
  const [{ token }, { return: returnTo }] = await Promise.all([params, searchParams]);
  return <PayView token={token} returnTo={safeReturn(returnTo)} />;
}

/** Only our own app links (Nikl builds, or Expo Go while developing) can be returned to. */
function safeReturn(url: string | undefined): string | null {
  if (!url) return null;
  return /^(nikl:\/\/|exps?:\/\/)[^\s"'<>]+$/.test(url) ? url : null;
}
