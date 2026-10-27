import React from 'react';
import { DuplicateMatch } from '@/types/database';
import { AlertCircle, Users, Navigation, PlusCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface DuplicateWarningModalProps {
  duplicates: DuplicateMatch[];
  onConfirmExisting: (duplicateId: string) => void;
  onSubmitAsNew: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  duplicates,
  onConfirmExisting,
  onSubmitAsNew,
  onCancel,
  isProcessing = false,
}) => {
  const formatDistance = (m: number) => {
    if (m < 1000) return `${m} m away`;
    return `${(m / 1000).toFixed(1)} km away`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2
              id="dup-modal-title"
              className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight"
            >
              Looks like an existing report
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              We found {duplicates.length} active hazard{duplicates.length > 1 ? 's' : ''} reported very close to this location. You can add your confirmation to an existing report or proceed with a new one.
            </p>
          </div>
        </div>

        {/* Existing duplicate matches list */}
        <div className="space-y-3">
          {duplicates.map((dup) => (
            <div
              key={dup.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400 transition"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {dup.type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    <Navigation className="w-3 h-3" />
                    {formatDistance(dup.distance_m)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    <Users className="w-3 h-3" />
                    {dup.confirmations} report{dup.confirmations > 1 ? 's' : ''}
                  </span>
                </div>

                {dup.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                    "{dup.description}"
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onConfirmExisting(dup.id)}
                disabled={isProcessing}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add my report to it</span>
              </button>
            </div>
          ))}
        </div>

        {/* Decision Actions */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Edit</span>
          </button>

          <button
            type="button"
            onClick={onSubmitAsNew}
            disabled={isProcessing}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit as New Incident</span>
          </button>
        </div>
      </div>
    </div>
  );
};
