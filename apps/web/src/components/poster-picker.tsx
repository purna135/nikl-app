"use client";

import { useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type PosterValue = { url: string; path: string } | null;

/**
 * Uploads a poster straight to Supabase Storage (bucket "posters", the user's own folder).
 * Storage rules on the server make sure people can only write to their own folder.
 */
export function PosterPicker({ userId, value, onChange }: { userId: string; value: PosterValue; onChange: (v: PosterValue) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Keep the poster under 5 MB.");
    const supabase = getSupabase();
    if (!supabase) return setError("Uploads aren't connected yet.");
    setBusy(true);
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("posters").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (upErr) return setError("The upload didn't work. Check your connection and try again.");
    const { data } = supabase.storage.from("posters").getPublicUrl(path);
    onChange({ url: data.publicUrl, path });
  }

  return (
    <div className="poster-picker">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded poster preview
        <img src={value.url} alt="Event poster" className="poster-preview" />
      ) : (
        <div className="poster-empty" aria-hidden="true">
          🖼️
        </div>
      )}
      <div className="poster-actions">
        <button type="button" className="btn" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : value ? "Change poster" : "Upload poster"}
        </button>
        {value && (
          <button type="button" className="link" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        <p className="hint">JPG, PNG or WebP, up to 5 MB. Square or 4:5 looks best in the feed.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
