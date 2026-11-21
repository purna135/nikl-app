import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap auth">
        <div className="card" style={{ textAlign: "center" }}>
          <h1>Nothing here</h1>
          <p>This page may have moved, or the event is no longer listed.</p>
          <Link href="/explore" className="btn primary block">
            Explore events
          </Link>
        </div>
      </main>
    </>
  );
}
