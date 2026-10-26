import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { FloatingSOSButton } from './FloatingSOSButton';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <Header />
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <FloatingSOSButton />
      <BottomNav />
    </div>
  );
};
