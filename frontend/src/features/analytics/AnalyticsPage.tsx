import React from 'react';
import { BarChart3 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise Procurement & Business Intelligence Analytics
          </p>
        </div>
      </div>

      {/* BLANK CONTENT CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
          <BarChart3 size={32} />
        </div>
        <h3 className="text-base font-bold text-slate-800">Analytics Module</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          This section is reserved for enterprise reports and business intelligence analytics.
        </p>
      </div>
    </div>
  );
};
