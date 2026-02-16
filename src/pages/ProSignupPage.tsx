import { useState, type FormEvent } from 'react';
import { PRO_FEATURES } from './ProPage';

export function ProSignupPage() {
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

  if (status === 'success') {
    return (
      <>
        <header>
          <h1>x-dl</h1>
          <p className="subtitle">Pro Sign Up</p>
        </header>
        <main>
          <div className="signup-success">
            <h2>Thanks! We'll notify you when Pro is ready.</h2>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Pro Sign Up</p>
      </header>

      <main>
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
      </main>
    </>
  );
}
