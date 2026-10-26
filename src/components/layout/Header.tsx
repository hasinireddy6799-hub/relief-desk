import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPill } from '@/components/common/StatusPill';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, User, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { role, isAnonymous } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <ShieldCheck className="w-3 h-3" />
            {t('roles.admin')}
          </span>
        );
      case 'coordinator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <ShieldCheck className="w-3 h-3" />
            {t('roles.coordinator')}
          </span>
        );
      case 'volunteer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
            <ShieldCheck className="w-3 h-3" />
            {t('roles.volunteer')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400">
            <User className="w-3 h-3" />
            {isAnonymous ? t('common.anonymous') : t('roles.citizen')}
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <Link
          to="/"
          className="flex items-center gap-2 text-ink dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-brand rounded-lg p-1"
          aria-label="Relief Desk Home"
        >
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none text-slate-900 dark:text-slate-100">
              {t('common.appName')}
            </h1>
            <div className="mt-0.5">{getRoleBadge()}</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <StatusPill />
        </div>
      </div>
    </header>
  );
};
