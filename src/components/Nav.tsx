import { NavLink } from 'react-router-dom';

export function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand">
        x-dl
      </NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Download
        </NavLink>
        <NavLink to="/article" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Article
        </NavLink>
        <NavLink to="/pro" className={({ isActive }) => `nav-link nav-link-pro ${isActive ? 'active' : ''}`}>
          <svg className="crown-icon-sm" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-3.67.97L13.3 4.2a1.4 1.4 0 0 0-2.6 0L7.44 9.55l-3.67-.97c-.8-.21-1.63.26-1.84 1.06-.11.4-.02.82.24 1.14L6.8 16h10.4l4.63-5.22c.26-.32.35-.74.24-1.14z"/>
          </svg>
          {' '}Pro
        </NavLink>
      </div>
    </nav>
  );
}
