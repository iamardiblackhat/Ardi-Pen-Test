/**
 * Pull the human-readable message out of a failed API call.
 *
 * The generated client throws an ApiError whose `.data` is the backend's JSON
 * body — typically `{ error: "..." }`. Surfacing that beats a hardcoded
 * message, so a user sees "That email is already registered" rather than a
 * generic "please try again" that hides what actually went wrong.
 */
export function backendError(err: unknown, fallback: string): string {
  const data = (err as { data?: unknown })?.data;
  if (data && typeof data === 'object' && 'error' in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
