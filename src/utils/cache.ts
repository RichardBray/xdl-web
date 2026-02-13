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

// ── Download History ──

const HISTORY_KEY = 'xdl-download-history';
const MAX_HISTORY = 10;

export interface DownloadHistoryItem {
  url: string;
  filename: string;
  timestamp: number;
}

export function getDownloadHistory(): DownloadHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addToDownloadHistory(url: string, filename: string): void {
  try {
    let history = getDownloadHistory();
    // Remove duplicate if exists
    history = history.filter(item => item.url !== url);
    // Add to front
    history.unshift({ url, filename, timestamp: Date.now() });
    // Trim to max
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // silently ignore
  }
}
