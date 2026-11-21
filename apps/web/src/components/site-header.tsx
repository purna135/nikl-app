import Link from "next/link";

export function SiteHeader({ action = "login" }: { action?: "login" | "none" }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="wordmark" aria-label="Nikl home">
          Nikl
        </Link>
        <span className="grow" />
        {action === "login" && (
          <Link href="/login" className="btn dark">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
