import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapPage } from '@/pages/MapPage';
import { ReportPage } from '@/pages/ReportPage';
import { HelpPage } from '@/pages/HelpPage';
import { SheltersPage } from '@/pages/SheltersPage';
import { MorePage } from '@/pages/MorePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<MapPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="shelters" element={<SheltersPage />} />
              <Route path="more" element={<MorePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
