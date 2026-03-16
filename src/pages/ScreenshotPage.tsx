import { useState, useRef, useCallback } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { ScreenshotPreview, type ScreenshotSettings, type ScreenshotPreviewHandle } from '../components/ScreenshotPreview';
import { ScreenshotControls, PRESETS } from '../components/ScreenshotControls';
import { getScreenshotCache, setScreenshotCache } from '../utils/cache';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_SETTINGS: ScreenshotSettings = {
  bgType: 'gradient',
  bgColor: '#1a1a2e',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  gradientAngle: 135,
  padding: 48,
  borderRadius: 16,
  scale: 1,
  aspectRatio: 'auto',
};

export function ScreenshotPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [tweetTheme, setTweetTheme] = useState<'dark' | 'light'>('dark');
  const [hideActions, setHideActions] = useState(false);
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<number | null>(4); // Gradient Purple
  const previewRef = useRef<ScreenshotPreviewHandle>(null);
  const requestIdRef = useRef(0);
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write;

  const fetchScreenshot = useCallback(async (url: string, theme: 'dark' | 'light', hide: boolean) => {
    const myId = ++requestIdRef.current;
    const cached = getScreenshotCache(url, theme, hide);
    if (cached) {
      setImageData(cached.image);
      setStatus('success');
      return;
    }

    setStatus('loading');
    setMessage('Capturing tweet...');

    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, theme, hideActions: hide }),
      });

      if (!res.ok) {
        let errorMsg = 'Screenshot failed';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // Response may not be JSON (e.g. proxy error)
        }
        setStatus('error');
        setMessage(errorMsg);
        return;
      }

      const data = await res.json();
      if (requestIdRef.current !== myId) return; // stale — discard
      setImageData(data.image);
      setStatus('success');
      setScreenshotCache(url, theme, hide, data.image);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error');
    }
  }, []);

  const handleSubmit = (url: string) => {
    setCurrentUrl(url);
    fetchScreenshot(url, tweetTheme, hideActions);
  };

  const handleThemeChange = (theme: 'dark' | 'light') => {
    setTweetTheme(theme);
    if (currentUrl) fetchScreenshot(currentUrl, theme, hideActions);
  };

  const handleHideActionsChange = (hide: boolean) => {
    setHideActions(hide);
    if (currentUrl) fetchScreenshot(currentUrl, tweetTheme, hide);
  };

  const handlePresetSelect = (index: number) => {
    setActivePreset(index);
    setSettings((prev) => ({ ...prev, ...PRESETS[index].settings }));
  };

  const handleSettingsChange = (partial: Partial<ScreenshotSettings>) => {
    setActivePreset(null);
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleDownload = () => {
    const author = extractAuthor(currentUrl);
    previewRef.current?.downloadPng(`tweet-${author}-screenshot.png`);
  };

  const handleCopy = async () => {
    try {
      await previewRef.current?.copyToClipboard();
    } catch {
      // clipboard write failed silently
    }
  };

  return (
    <>
      <header>
        <h1>Screenshot</h1>
        <p className="subtitle">Capture beautiful tweet screenshots</p>
      </header>

      <main>
        <TweetInputForm
          onSubmit={handleSubmit}
          isLoading={status === 'loading'}
          placeholder="Paste a tweet URL..."
          buttonText="Capture"
        />

        {status === 'loading' && (
          <div className="status status-loading">
            <span className="spinner" />
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="status status-error">
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && imageData && (
          <div className="screenshot-workspace">
            <ScreenshotPreview ref={previewRef} imageData={imageData} settings={settings} />
            <ScreenshotControls
              settings={settings}
              tweetTheme={tweetTheme}
              hideActions={hideActions}
              activePreset={activePreset}
              onSettingsChange={handleSettingsChange}
              onThemeChange={handleThemeChange}
              onHideActionsChange={handleHideActionsChange}
              onPresetSelect={handlePresetSelect}
              onDownload={handleDownload}
              onCopy={handleCopy}
              canCopy={canCopy}
            />
          </div>
        )}
      </main>
    </>
  );
}

function extractAuthor(url: string): string {
  const match = url.match(/(?:twitter\.com|x\.com)\/(@?\w+)/);
  return match ? `@${match[1].replace('@', '')}` : 'unknown';
}
