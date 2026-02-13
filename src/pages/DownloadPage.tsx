import { useState } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { AboutSection } from '../components/AboutSection';
import { getCached, setCache, clearCache, getDownloadHistory, addToDownloadHistory, type DownloadHistoryItem } from '../utils/cache';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DownloadPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<DownloadHistoryItem[]>(getDownloadHistory);
  const [showRedownloadModal, setShowRedownloadModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');

  const performDownload = async (url: string) => {
    setStatus('loading');
    setMessage('Downloading video... This may take a moment.');

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
      addToDownloadHistory(url, filename);
      setHistory(getDownloadHistory());
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error');
    }
  };

  const handleDownload = async (url: string) => {
    const cached = getCached(url, 'download');
    if (cached && cached.type === 'download') {
      setPendingUrl(url);
      setShowRedownloadModal(true);
      return;
    }
    performDownload(url);
  };

  const handleRedownload = () => {
    setShowRedownloadModal(false);
    clearCache(pendingUrl, 'download');
    performDownload(pendingUrl);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Twitter/X Video Downloader</p>
      </header>

      <main>
        <AboutSection />
        <TweetInputForm onSubmit={handleDownload} isLoading={status === 'loading'} />

        {status !== 'idle' && (
          <div className={`status status-${status}`}>
            {status === 'loading' && <span className="spinner" />}
            <p>{message}</p>
          </div>
        )}

        {history.length > 0 && (
          <div className="download-history">
            <h3 className="history-title">Recent Downloads</h3>
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.url} className="history-item">
                  <span className="history-filename">{item.filename}</span>
                  <span className="history-date">{formatDate(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {showRedownloadModal && (
        <div className="modal-overlay" onClick={() => setShowRedownloadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRedownloadModal(false)}>✕</button>
            <h2>Already Downloaded</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
              You've already downloaded this video. Would you like to download it again?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="cancel-btn" onClick={() => setShowRedownloadModal(false)}>
                Cancel
              </button>
              <button className="pro-cta" onClick={handleRedownload}>
                Download Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
