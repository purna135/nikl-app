/**
 * Post photos are stored as paths in the public "post-media" bucket (the database never stores
 * full URLs for them, so a link can't point anywhere else). This builds the public URL.
 */
export function postMediaUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/post-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** "<user id>/<uuid>.jpg" — the only shape of post photo path we accept. */
export const POST_MEDIA_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
