import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOutbox } from '@/hooks/useOutbox';
import { OutboxModal } from './OutboxModal';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export const StatusPill: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { queuedCount, failedCount, isSyncing } = useOutbox();
  const [showOutboxModal, setShowOutboxModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowOutboxModal(true)}
        role="status"
        aria-live="polite"
        title="View local outbox and sync status"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition duration-200 shadow-sm border select-none hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
        style={{ minHeight: '36px' }}
      >
        {isSyncing ? (
          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>{t('common.syncing')}</span>
          </span>
        ) : !isOnline ? (
          <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {t('common.offline')}
              {queuedCount > 0 ? ` (${queuedCount} ${t('common.queued')})` : ''}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {t('common.online')}
              {queuedCount > 0 ? ` (${queuedCount} ${t('common.queued')})` : ''}
            </span>
          </span>
        )}

        {failedCount > 0 && (
          <span
            className="flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 px-1.5 py-0.5 rounded-full"
            title={`${failedCount} items require retry`}
          >
            <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>{failedCount}</span>
          </span>
        )}
      </button>

      {showOutboxModal && (
        <OutboxModal onClose={() => setShowOutboxModal(false)} />
      )}
    </>
  );
};
