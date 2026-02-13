import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { DownloadPage } from './pages/DownloadPage';
import { ArticlePage } from './pages/ArticlePage';
import { ProPage } from './pages/ProPage';
import { ProSignupPage } from './pages/ProSignupPage';
import { ArticleProvider } from './contexts/ArticleContext';
import './App.css';

function App() {
  return (
    <div className="app">
      <ArticleProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<DownloadPage />} />
          <Route path="/article" element={<ArticlePage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/pro/signup" element={<ProSignupPage />} />
        </Routes>
      </ArticleProvider>
    </div>
  );
}

export default App;
