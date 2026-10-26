import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {t('nav.report')} Incident
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Report hazards, structural damage, floods, blockages, or medical emergencies.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center">
        <Clock className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">
          Incident Reporting Engine
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Stage 2 will introduce the full offline reporting form, GPS pin locator, duplicate detection, and photo compression.
        </p>
      </div>
    </div>
  );
};
