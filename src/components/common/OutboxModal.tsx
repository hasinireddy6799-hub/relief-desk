import React, { useState } from 'react';
import { useOutbox } from '@/hooks/useOutbox';
import {
  syncOutbox,
  retryOutboxItem,
  retryAllFailedOutboxItems,
  dismissOutboxItem,
} from '@/services/syncEngine';
import {
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Database,
  Flame,
} from 'lucide-react';

interface OutboxModalProps {
  onClose: () => void;
}

export const OutboxModal: React.FC<OutboxModalProps> = ({ onClose }) => {
  const { queuedCount, failedCount, isSyncing, pendingItems, failedItems } = useOutbox();
  const [activeTab, setActiveTab] = useState<'pending' | 'failed'>(
    failedCount > 0 ? 'failed' : 'pending'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSyncNow = async () => {
    setIsProcessing(true);
    await syncOutbox();
    setIsProcessing(false);
  };

  const handleRetryAll = async () => {
    setIsProcessing(true);
    await retryAllFailedOutboxItems();
    setIsProcessing(false);
  };

  const handleRetryOne = async (id?: number) => {
    if (!id) return;
    setIsProcessing(true);
    await retryOutboxItem(id);
    setIsProcessing(false);
  };

  const handleDismissOne = async (id?: number) => {
    if (!id) return;
    await dismissOutboxItem(id);
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const formatTableName = (table: string, isSos?: boolean) => {
    if (isSos) return 'Emergency SOS Alert';
    switch (table) {
      case 'incidents':
        return 'Incident Report';
      case 'incident_confirmations':
        return 'Incident Confirmation';
      case 'incident_media':
        return 'Photo Upload';
      case 'incident_updates':
        return 'Status / Timeline Note';
      case 'help_requests':
        return 'Help Request';
      case 'missing_persons':
        return 'Missing Person Report';
      case 'shelter_checkins':
        return 'Shelter Check-in';
      case 'supply_transactions':
        return 'Supply Transaction';
      case 'alerts':
        return 'Public Alert Broadcast';
      default:
        return table;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outbox-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="outbox-modal-title"
                className="text-base font-black text-slate-900 dark:text-slate-100"
              >
                Outbox & Offline Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reports stored locally, uploaded when online in priority order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Top Actions */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({queuedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('failed')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'failed'
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Needs Attention ({failedCount})</span>
            </button>
          </div>

          <div className="flex gap-2">
            {activeTab === 'failed' && failedCount > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={isProcessing}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry All</span>
              </button>
            )}

            <button
              onClick={handleSyncNow}
              disabled={isProcessing || isSyncing}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing || isSyncing ? 'animate-spin' : ''}`} />
              <span>{isProcessing || isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'pending' ? (
            pendingItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  All Items Synced
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  There are no pending local changes waiting to upload.
                </p>
              </div>
            ) : (
              pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.is_sos && (
                        <span className="p-1 rounded-md bg-red-100 text-red-600 dark:bg-red-950">
                          <Flame className="w-3.5 h-3.5 animate-pulse" />
                        </span>
                      )}
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {formatTableName(item.table, item.is_sos)}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Queued {getTimeAgo(item.createdAt)} • Priority #{item.is_sos ? '0 (SOS)' : 'Normal'}
                    </p>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    ID #{item.id}
                  </span>
                </div>
              ))
            )
          ) : failedItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No Failed Items
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No reports require attention or manual retry.
              </p>
            </div>
          ) : (
            failedItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-red-800 dark:text-red-300">
                      {formatTableName(item.table, item.is_sos)}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                      {item.attempts} retries
                    </span>
                  </div>
                  {item.lastError && (
                    <p className="text-xs text-red-700 dark:text-red-400 line-clamp-2">
                      Error: {item.lastError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Created {getTimeAgo(item.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRetryOne(item.id)}
                    disabled={isProcessing}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissOne(item.id)}
                    title="Dismiss item from queue"
                    className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <span>{queuedCount + failedCount} total queued locally</span>
          <button
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
