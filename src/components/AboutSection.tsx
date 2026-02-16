export function AboutSection() {
  return (
    <p className="about-section">
      Powered by{' '}
      <a href="https://github.com/RichardBray/x-dl" target="_blank" rel="noopener noreferrer">
        x-dl
      </a>
      , a free and open source CLI tool for extracting videos from X/Twitter.
      This web interface wraps x-dl to provide video downloads and AI-powered
      article generation from video content.
    </p>
  );
}
