import { useState } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'react-jss';
import { store } from './store';
import { trpc, createTrpcClient } from './trpc';
import { theme } from './theme';
import { HomePage } from './pages/HomePage';
import { DrawPage } from './pages/DrawPage';
import { GamePage } from './pages/GamePage';
import { LogbookPage } from './pages/LogbookPage';
import { LogbooksPage } from './pages/LogbooksPage';
import { RulesLogPage } from './pages/RulesLogPage';
import { RulesPage } from './pages/RulesPage';

export function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/draw" element={<DrawPage />} />
                <Route path="/g/:gameId" element={<GamePage />} />
                <Route path="/logbook" element={<LogbooksPage />} />
                <Route path="/log/:logId" element={<LogbookPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/rules/log" element={<RulesLogPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </Provider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
