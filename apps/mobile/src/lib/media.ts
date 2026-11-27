import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import type { NiklClient } from '@nikl/supabase';
import { shrinkWidth } from '@nikl/utils';

/** A photo picked from the phone's gallery (not uploaded yet). */
export type PickedPhoto = { uri: string; width: number; height: number };

export type PickResult = { status: 'picked'; photos: PickedPhoto[] } | { status: 'cancelled' } | { status: 'denied' } | { status: 'failed' };

function launch(max: number) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: max > 1,
    selectionLimit: max,
    orderedSelection: true,
    quality: 1,
  });
}

/**
 * Opens the phone's photo picker for up to `max` photos. The system picker needs no permission on
 * current phones; if the phone still asks for one, we ask once and report a "no" as `denied`.
 */
export async function pickPhotos(max: number): Promise<PickResult> {
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await launch(max);
  } catch {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
      result = await launch(max);
    } catch {
      return { status: 'failed' };
    }
  }
  if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
  return {
    status: 'picked',
    photos: result.assets.slice(0, max).map((a) => ({ uri: a.uri, width: a.width, height: a.height })),
  };
}

/** Explains a failed pick. Cancelling says nothing. */
export function explainPickProblem(result: PickResult) {
  if (result.status === 'denied') {
    Alert.alert('Nikl can’t see your photos', 'Allow photo access for Nikl in your phone’s Settings, then try again.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
    ]);
  } else if (result.status === 'failed') {
    Alert.alert('Couldn’t open your photos', 'Try again in a moment.');
  }
}

/** Photos are shrunk to at most this wide and saved as JPEG before upload (DEV_PLAN §5.3). */
const MAX_WIDTH = 1080;
const JPEG_QUALITY = 0.8;

async function compress(photo: PickedPhoto): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  try {
    const width = shrinkWidth(photo.width, MAX_WIDTH);
    if (width !== null) context.resize({ width, height: null });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
      return saved.uri;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

/**
 * Shrinks a photo and uploads it to the person's own folder in "post-media".
 * Returns the storage path ("<user id>/<uuid>.jpg") that posts and stories point to. Throws on failure.
 */
export async function uploadPhoto(client: NiklClient, userId: string, photo: PickedPhoto): Promise<string> {
  const uri = await compress(photo);
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId.toLowerCase()}/${randomUUID().toLowerCase()}.jpg`;
  const { error } = await client.storage.from('post-media').upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** Deletes photos from the person's own folder (e.g. after a failed post, or when deleting one). */
export async function removePhotos(client: NiklClient, userId: string, paths: (string | null | undefined)[]) {
  const own = paths.filter((p): p is string => typeof p === 'string' && p.startsWith(`${userId.toLowerCase()}/`));
  if (own.length === 0) return;
  try {
    await client.storage.from('post-media').remove(own);
  } catch {
    // A leftover photo is only wasted space; it is never shown without a post or story.
  }
}
