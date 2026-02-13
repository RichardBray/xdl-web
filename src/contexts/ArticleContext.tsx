import { createContext, useContext, useState, type ReactNode } from 'react';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface ArticleState {
  article: string;
  transcript: TranscriptSegment[];
  lastUrl: string;
  activeTab?: 'article' | 'transcript';
}

interface ArticleContextType {
  state: ArticleState;
  setState: (state: ArticleState) => void;
  clear: () => void;
}

const defaultState: ArticleState = { article: '', transcript: [], lastUrl: '' };

const ArticleContext = createContext<ArticleContextType>({
  state: defaultState,
  setState: () => {},
  clear: () => {},
});

export function ArticleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ArticleState>(defaultState);
  const clear = () => setState(defaultState);
  return (
    <ArticleContext.Provider value={{ state, setState, clear }}>
      {children}
    </ArticleContext.Provider>
  );
}

export function useArticleState() {
  return useContext(ArticleContext);
}
