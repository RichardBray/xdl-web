import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { DownloadPage } from './pages/DownloadPage';
import { ArticlePage } from './pages/ArticlePage';
import { ProPage } from './pages/ProPage';
import { ProSignupPage } from './pages/ProSignupPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <Nav />
      <Routes>
        <Route path="/" element={<DownloadPage />} />
        <Route path="/article" element={<ArticlePage />} />
        <Route path="/pro" element={<ProPage />} />
        <Route path="/pro/signup" element={<ProSignupPage />} />
      </Routes>
    </div>
  );
}

export default App;
