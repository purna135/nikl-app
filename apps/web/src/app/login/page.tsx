import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap auth">
        <LoginForm />
      </main>
    </>
  );
}
