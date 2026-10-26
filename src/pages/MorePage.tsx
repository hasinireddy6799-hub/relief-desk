import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useOutbox } from '@/hooks/useOutbox';
import {
  Globe,
  User,
  Database,
  Wifi,
  LogIn,
  LogOut,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

export const MorePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, role, isAnonymous, signInWithEmail, signUpWithEmail, signOut, refreshProfile } = useAuth();
  const { queuedCount, failedCount, isSyncing } = useOutbox();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(() => {
    return localStorage.getItem('relief_desk_low_data') === 'true';
  });

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleLowDataToggle = () => {
    const nextVal = !lowDataMode;
    setLowDataMode(nextVal);
    localStorage.setItem('relief_desk_low_data', String(nextVal));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) setAuthError(error.message);
      } else {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) setAuthError(error.message);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('more.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Settings, account credentials, language, and offline storage.
        </p>
      </div>

      {/* Account & Role Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">
              {t('auth.title')}
            </h2>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {role}
          </span>
        </div>

        {isAnonymous ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 text-xs text-amber-900 dark:text-amber-200">
            <p>{t('auth.guestNotice')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('auth.signedInAs')}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user?.email}
            </p>
          </div>
        )}

        {isAnonymous ? (
          <form onSubmit={handleAuthSubmit} className="pt-2 space-y-3">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`text-xs font-bold pb-1 border-b-2 transition ${
                  authMode === 'signin'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {t('common.signIn')}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`text-xs font-bold pb-1 border-b-2 transition ${
                  authMode === 'signup'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {t('common.signUp')}
              </button>
            </div>

            {authError && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/50 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
                {authError}
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.fullNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Sreehitha"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.passwordLabel')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : authMode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('common.signIn')}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t('common.signUp')}
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => signOut()}
              className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              {t('common.signOut')}
            </button>
            <button
              onClick={() => refreshProfile()}
              className="min-h-[44px] px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Profile
            </button>
          </div>
        )}
      </div>

      {/* Language Preferences */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">
            {t('more.language')}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition ${
              i18n.language.startsWith('en')
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            English (EN)
          </button>
          <button
            onClick={() => handleLanguageChange('es')}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition ${
              i18n.language.startsWith('es')
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Español (ES)
          </button>
        </div>
      </div>

      {/* Low-Data Mode Toggle */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between">
        <div className="space-y-0.5 pr-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {t('more.lowDataMode')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('more.lowDataDesc')}
          </p>
        </div>
        <button
          onClick={handleLowDataToggle}
          role="switch"
          aria-checked={lowDataMode}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            lowDataMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              lowDataMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Offline Storage & Outbox Stats */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Local Outbox & Storage
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Pending</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {queuedCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Failed</span>
            <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">
              {failedCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
              {isSyncing ? 'Syncing' : 'Idle'}
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        {t('more.version')}
      </div>
    </div>
  );
};
