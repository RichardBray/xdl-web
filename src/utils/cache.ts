const CACHE_PREFIX = 'xdl-cache:';

interface DownloadCacheEntry {
  type: 'download';
  message: string;
  timestamp: number;
}

interface ArticleCacheEntry {
  type: 'article';
  article: string;
  transcript: { start: number; end: number; text: string }[];
  timestamp: number;
}

type CacheEntry = DownloadCacheEntry | ArticleCacheEntry;

function getKey(url: string, type: 'download' | 'article'): string {
  return `${CACHE_PREFIX}${type}:${url}`;
}

export function getCached(url: string, type: 'download' | 'article'): CacheEntry | null {
  try {
    const raw = localStorage.getItem(getKey(url, type));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCache(url: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(getKey(url, entry.type), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
