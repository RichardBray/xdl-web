import { Link } from 'react-router-dom';

const PRO_FEATURES = [
  { name: 'Batch Processing', desc: 'Download multiple videos at once' },
  { name: 'Priority Transcription', desc: 'Faster queue for article generation' },
  { name: 'Export Formats', desc: 'PDF, DOCX, and Markdown exports' },
  { name: 'Custom Article Styles', desc: 'Choose tone and format for articles' },
  { name: 'History Dashboard', desc: 'Access all previous downloads and articles' },
  { name: 'API Access', desc: 'Programmatic access to all features' },
];

export function ProPage() {
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

        <Link to="/pro/signup" className="pro-cta">
          Sign Up for Pro
        </Link>
      </main>
    </>
  );
}

export { PRO_FEATURES };
