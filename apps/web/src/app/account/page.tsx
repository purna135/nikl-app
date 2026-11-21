import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Your account" };

/**
 * The session is read in the browser for week 1. Server-side session checks (behind a
 * <Suspense> boundary, as Cache Components requires) arrive with the organizer dashboard in week 2.
 */
export default function AccountPage() {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap auth">
        <AccountView />
      </main>
    </>
  );
}
