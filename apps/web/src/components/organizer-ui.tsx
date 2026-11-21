import Link from "next/link";
import { categoryById } from "@nikl/utils";

/** Header for the organizer and admin areas. Static, so it renders instantly. */
export function OrganizerHeader({ section = "Organizer" }: { section?: string }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="wordmark" aria-label="Nikl home">
          Nikl
        </Link>
        <span className="section-tag">{section}</span>
        <span className="grow" />
        <Link href="/organizer" className="nav-link">
          Dashboard
        </Link>
        <Link href="/account" className="nav-link hide-sm">
          Account
        </Link>
      </div>
    </header>
  );
}

type ClubReview = "pending" | "approved" | "rejected" | "suspended";
type EventStatus = "draft" | "published" | "cancelled" | "ended";

export function clubStatusLabel(status: ClubReview): { label: string; tone: "warn" | "good" | "bad" } {
  switch (status) {
    case "approved":
      return { label: "Live", tone: "good" };
    case "pending":
      return { label: "Waiting for approval", tone: "warn" };
    case "rejected":
      return { label: "Changes needed", tone: "bad" };
    case "suspended":
      return { label: "Suspended", tone: "bad" };
  }
}

/** What the public can see, combining the event's status with the club's approval. */
export function eventStatusLabel(status: EventStatus, clubLive: boolean): { label: string; tone: "muted" | "warn" | "good" | "bad" } {
  if (status === "draft") return { label: "Draft", tone: "muted" };
  if (status === "cancelled") return { label: "Cancelled", tone: "bad" };
  if (status === "ended") return { label: "Ended", tone: "muted" };
  return clubLive ? { label: "Live", tone: "good" } : { label: "Goes live when approved", tone: "warn" };
}

export function Pill({ tone, children }: { tone: "muted" | "warn" | "good" | "bad"; children: React.ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/** Poster thumbnail, or a calm category tile when there's no poster yet. */
export function PosterThumb({ url, category, size = 64 }: { url: string | null; category: string; size?: number }) {
  const cat = categoryById(category);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage at any size
    return <img src={url} alt="" className="thumb" width={size} height={size} />;
  }
  return (
    <span className="thumb thumb-tile" style={{ width: size, height: size, ["--tint" as string]: `var(--tint-${cat?.tint ?? "sky"})` }} aria-hidden="true">
      {cat?.emoji ?? "📅"}
    </span>
  );
}

export function DashSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 72 }} />
    </div>
  );
}
