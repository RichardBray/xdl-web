import { useState, useRef } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { ProgressSteps } from '../components/ProgressSteps';
import { ArticleDisplay } from '../components/ArticleDisplay';
type ArticleStep = 'downloading' | 'extracting_audio' | 'transcribing' | 'writing' | 'done' | 'error';
type PageStep = ArticleStep | 'idle';

export function ArticlePage() {
  const [step, setStep] = useState<PageStep>('idle');
  const [article, setArticle] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStep('downloading');
    setArticle('');
    setError('');
    setCopied(false);

    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Request failed');
        setStep('error');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('No response stream');
        setStep('error');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'stage') {
              setStep(data as ArticleStep);
            } else if (currentEvent === 'chunk') {
              setArticle(prev => prev + data);
            } else if (currentEvent === 'done') {
              setStep('done');
            } else if (currentEvent === 'error') {
              setError(data);
              setStep('error');
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Network error');
      setStep('error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(article);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProcessing = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Video to Article</p>
      </header>

      <main>
        <TweetInputForm
          onSubmit={handleSubmit}
          isLoading={isProcessing}
          placeholder="Paste a video tweet URL..."
          buttonText="Generate"
        />

        {step !== 'idle' && step !== 'error' && (
          <ProgressSteps currentStep={step === 'done' ? 'done' : step as ArticleStep} />
        )}

        {step === 'error' && (
          <div className="status status-error">
            <p>{error}</p>
          </div>
        )}

        {(step === 'writing' || step === 'done') && article && (
          <div style={{ position: 'relative' }}>
            <ArticleDisplay article={article} />
            <button
              onClick={handleCopy}
              className="copy-btn"
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
