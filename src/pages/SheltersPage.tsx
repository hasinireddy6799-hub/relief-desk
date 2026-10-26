import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Clock } from 'lucide-react';

export const SheltersPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-500" />
          {t('nav.shelters')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Locate safe emergency shelters, check live capacities, and access amenities.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center">
        <Clock className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">
          Emergency Shelters & Supplies
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Stage 5 will connect shelter capacity gauges, check-in logging, and supply inventories.
        </p>
      </div>
    </div>
  );
};
