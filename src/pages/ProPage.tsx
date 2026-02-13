import { useState, type FormEvent } from 'react';

const PRO_FEATURES = [
  { name: 'Batch Processing', desc: 'Download multiple videos at once' },
  { name: 'Priority Transcription', desc: 'Faster queue for article generation' },
  { name: 'Export Formats', desc: 'PDF, DOCX, and Markdown exports' },
  { name: 'Custom Article Styles', desc: 'Choose tone and format for articles' },
  { name: 'History Dashboard', desc: 'Access all previous downloads and articles' },
  { name: 'API Access', desc: 'Programmatic access to all features' },
];

export function ProPage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleInterest = (name: string) => {
    setInterests(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/pro/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interests }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Signup failed');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (status === 'success') {
      setStatus('idle');
      setEmail('');
      setInterests([]);
    }
  };

  return (
    <>
      <header>
        <h1 className="pro-title">
          <svg className="crown-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-3.67.97L13.3 4.2a1.4 1.4 0 0 0-2.6 0L7.44 9.55l-3.67-.97c-.8-.21-1.63.26-1.84 1.06-.11.4-.02.82.24 1.14L6.8 16h10.4l4.63-5.22c.26-.32.35-.74.24-1.14z"/>
          </svg>
          {' '}Pro
        </h1>
        <p className="subtitle">Unlock the full power of XDL</p>
      </header>

      <main>
        <div className="pro-price">
          <span className="pro-price-amount">$7.99</span>
          <span className="pro-price-period">/month</span>
        </div>

        <div className="pro-feature-card">
          <ul className="pro-feature-list">
            {PRO_FEATURES.map((feature) => (
              <li key={feature.name}>
                <strong>{feature.name}</strong> — {feature.desc}
              </li>
            ))}
          </ul>
        </div>

        <button className="pro-cta" onClick={() => setShowModal(true)}>
          Sign Up for Pro
        </button>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              &times;
            </button>

            {status === 'success' ? (
              <div className="signup-success">
                <h2>Thanks! We'll notify you when Pro is ready.</h2>
              </div>
            ) : (
              <>
                <div className="signup-intro">
                  <h2>Pro features are coming soon!</h2>
                  <p>Tell us what you're most excited about.</p>
                </div>

                <form onSubmit={handleSubmit} className="signup-form">
                  <div className="signup-interests">
                    {PRO_FEATURES.map((feature) => (
                      <label key={feature.name} className="signup-checkbox">
                        <input
                          type="checkbox"
                          checked={interests.includes(feature.name)}
                          onChange={() => toggleInterest(feature.name)}
                        />
                        <span className="checkbox-label">
                          <strong>{feature.name}</strong> — {feature.desc}
                        </span>
                      </label>
                    ))}
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email to be notified"
                    className="signup-email"
                    required
                  />

                  <button type="submit" className="pro-cta" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Submitting...' : 'Notify Me'}
                  </button>

                  {status === 'error' && (
                    <div className="status status-error" style={{ marginTop: '1rem' }}>
                      <p>{errorMsg}</p>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export { PRO_FEATURES };
