import { useState } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { getCached, setCache } from '../utils/cache';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DownloadPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleDownload = async (url: string) => {
    setStatus('loading');
    setMessage('Downloading video... This may take a moment.');

    const cached = getCached(url, 'download');
    if (cached && cached.type === 'download') {
      setStatus('success');
      setMessage(cached.message);
      return;
    }

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Download failed');
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'video.mp4';

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      setStatus('success');
      setMessage('Video downloaded successfully!');
      setCache(url, { type: 'download', message: 'Video downloaded successfully!', timestamp: Date.now() });
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error');
    }
  };

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Twitter/X Video Downloader</p>
      </header>

      <main>
        <TweetInputForm onSubmit={handleDownload} isLoading={status === 'loading'} />

        {status !== 'idle' && (
          <div className={`status status-${status}`}>
            {status === 'loading' && <span className="spinner" />}
            <p>{message}</p>
          </div>
        )}
      </main>
    </>
  );
}
