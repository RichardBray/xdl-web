import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { DownloadPage } from './pages/DownloadPage';
import { ArticlePage } from './pages/ArticlePage';
import { ProPage } from './pages/ProPage';
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
        </Routes>
        <Footer />
      </ArticleProvider>
    </div>
  );
}

export default App;
