import Link from "next/link";

export function SiteHeader({ action = "login" }: { action?: "login" | "none" }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="wordmark" aria-label="Nikl home">
          Nikl
        </Link>
        <span className="grow" />
        <Link href="/explore" className="nav-link">
          Explore
        </Link>
        {action === "login" && (
          <Link href="/organizer" className="nav-link hide-sm">
            For organizers
          </Link>
        )}
        {action === "login" && (
          <Link href="/login" className="btn dark">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
