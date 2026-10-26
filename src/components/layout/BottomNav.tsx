import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Map, AlertTriangle, LifeBuoy, Building2, MoreHorizontal } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', label: t('nav.map'), icon: Map },
    { to: '/report', label: t('nav.report'), icon: AlertTriangle },
    { to: '/help', label: t('nav.help'), icon: LifeBuoy },
    { to: '/shelters', label: t('nav.shelters'), icon: Building2 },
    { to: '/more', label: t('nav.more'), icon: MoreHorizontal },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pb-safe"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[56px] text-xs font-semibold transition-colors duration-150 select-none ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-blue-950/60 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="mt-0.5 tracking-tight truncate max-w-[64px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
