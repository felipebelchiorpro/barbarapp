import PocketBase from 'pocketbase';

export const POCKETBASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_POCKETBASE_URL) ||
  'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

/**
 * Check if the local PocketBase server is reachable
 */
export async function checkPocketBaseHealth(): Promise<boolean> {
  try {
    const health = await pb.health.check();
    return health.code === 200;
  } catch {
    return false;
  }
}
