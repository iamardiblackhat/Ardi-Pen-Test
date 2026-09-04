import { auth } from '@/lib/auth';
import type { IntelligenceFeed } from './intelligence-types';

export async function fetchIntelligenceFeed(
  search: string,
  signal?: AbortSignal,
): Promise<IntelligenceFeed> {
  const params = new URLSearchParams({ limit: '10' });
  if (search.trim()) params.set('search', search.trim());
  const token = auth.getToken();
  const response = await fetch(`/api/intelligence/feed?${params}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal,
  });
  const body = (await response.json()) as IntelligenceFeed & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? 'The live intelligence feed could not be loaded.');
  }
  return body;
}
