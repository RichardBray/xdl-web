import { useState, useRef, useEffect } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { AboutSection } from '../components/AboutSection';
import { ProgressSteps } from '../components/ProgressSteps';
import { ArticleDisplay } from '../components/ArticleDisplay';
import { TranscriptDisplay } from '../components/TranscriptDisplay';
import { getCached, setCache } from '../utils/cache';
import { useArticleState } from '../contexts/ArticleContext';

type ArticleStep = 'downloading' | 'extracting_audio' | 'transcribing' | 'writing' | 'done' | 'error';
type PageStep = ArticleStep | 'idle';
type Tab = 'article' | 'transcript';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export function ArticlePage() {
  const [step, setStep] = useState<PageStep>('idle');
  const [article, setArticle] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('article');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUrlRef = useRef('');
  const { state: savedState, setState: saveState } = useArticleState();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (savedState.article && step === 'idle') {
      setArticle(savedState.article);
      setTranscript(savedState.transcript);
      setStep('done');
      setActiveTab(savedState.activeTab || 'article');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'idle' && step !== 'error' && article) {
      saveState({ article, transcript, lastUrl: currentUrlRef.current, activeTab });
    }
  }, [step, article, transcript, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (url: string) => {
    // Check cache first
    const cached = getCached(url, 'article');
    if (cached && cached.type === 'article') {
      setArticle(cached.article);
      setTranscript(cached.transcript);
      setStep('done');
      setActiveTab('article');
      setError('');
      saveState({ article: cached.article, transcript: cached.transcript, lastUrl: url });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    currentUrlRef.current = url;

    setStep('downloading');
    setArticle('');
    setTranscript([]);
    setError('');
    setCopied(false);
    setActiveTab('article');
    setShowTimeoutWarning(false);

    // Start timeout warning timer (170s)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTimeoutWarning(true), 170_000);

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
      let fullArticle = '';

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
              fullArticle += data;
              setArticle(prev => prev + data);
            } else if (currentEvent === 'done') {
              if (data && data.transcript) {
                setTranscript(data.transcript);
                setCache(currentUrlRef.current, {
                  type: 'article',
                  article: fullArticle,
                  transcript: data.transcript,
                  timestamp: Date.now(),
                });
              }
              setStep('done');
              saveState({ article: fullArticle, transcript: data.transcript, lastUrl: currentUrlRef.current });
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
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowTimeoutWarning(false);
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
        <AboutSection />
        <TweetInputForm
          onSubmit={handleSubmit}
          isLoading={isProcessing}
          placeholder="Paste a video tweet URL..."
          buttonText="Generate"
        />

        {isProcessing && !article && (
          <div className="status status-loading">
            <span className="spinner" />
            <p>Generating article...</p>
          </div>
        )}

        {step !== 'idle' && step !== 'error' && (
          <ProgressSteps currentStep={step === 'done' ? 'done' : step as ArticleStep} />
        )}

        {showTimeoutWarning && isProcessing && (
          <div className="timeout-warning">
            Processing is taking longer than expected. Please wait...
          </div>
        )}

        {step === 'error' && (
          <div className="status status-error">
            <p>{error}</p>
          </div>
        )}

        {(step === 'writing' || step === 'done') && article && (
          <>
            {step === 'done' && transcript.length > 0 && (
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'article' ? 'active' : ''}`}
                  onClick={() => setActiveTab('article')}
                >
                  Article
                </button>
                <button
                  className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transcript')}
                >
                  Transcript
                </button>
              </div>
            )}

            {activeTab === 'article' && (
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

            {activeTab === 'transcript' && transcript.length > 0 && (
              <TranscriptDisplay segments={transcript} />
            )}
          </>
        )}
      </main>
    </>
  );
}
