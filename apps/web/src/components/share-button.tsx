"use client";

import { useState } from "react";

/** Share sheet on phones, copy link on desktop, plus a direct WhatsApp share (how most plans spread in India). */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  function whatsapp() {
    const text = `${title} ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="actions-row">
      <button type="button" className="btn" onClick={share}>
        {copied ? "Link copied" : "Share"}
      </button>
      <button type="button" className="btn" onClick={whatsapp}>
        WhatsApp
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
