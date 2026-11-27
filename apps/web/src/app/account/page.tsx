import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Your account" };

/**
 * The session is read in the browser here. Organizer and admin pages check it on the server instead
 * (lib/auth.ts, inside <Suspense> as Cache Components requires).
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
