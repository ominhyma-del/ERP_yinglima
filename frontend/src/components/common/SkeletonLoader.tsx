import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 7 }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs animate-pulse">
      {/* Header bar skeleton */}
      <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="h-4 bg-slate-300 rounded w-1/4"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
          <div className="h-8 bg-slate-200 rounded-lg w-24"></div>
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-3">
        <div className="h-9 bg-slate-200 rounded-lg w-64"></div>
        <div className="h-9 bg-slate-200 rounded-lg w-32"></div>
        <div className="h-9 bg-slate-200 rounded-lg w-32"></div>
      </div>

      {/* Table Rows skeleton */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-4 h-4 bg-slate-200 rounded shrink-0"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-1/5"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/8"></div>
            <div className="h-6 bg-slate-200 rounded-full w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between mb-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-slate-300 rounded w-48"></div>
        <div className="h-3 bg-slate-200 rounded w-72"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
        <div className="h-9 bg-blue-200 rounded-lg w-32"></div>
      </div>
    </div>
  );
};

export const GhostPageLoader: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeaderSkeleton />
      <TableSkeleton rows={7} />
    </div>
  );
};
