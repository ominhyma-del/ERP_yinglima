import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalEntries,
  onPageChange,
  onPageSizeChange,
}) => {
  const [jumpValue, setJumpValue] = useState('');

  if (totalEntries === 0) return null;

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  // Jump to page on Enter key
  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = parseInt(jumpValue, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        onPageChange(p);
      }
      setJumpValue('');
    }
  };

  // Generate page number sequence — shows up to 7 page buttons with ... ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 4) pages.push('...');

      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 3) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 border-t border-slate-200 text-xs text-slate-600">
      {/* LEFT: Showing X to Y of Z Entries */}
      <div className="font-medium text-slate-500">
        Showing <span className="font-bold text-slate-800">{startEntry.toLocaleString()}</span> to{' '}
        <span className="font-bold text-slate-800">{endEntry.toLocaleString()}</span> of{' '}
        <span className="font-bold text-slate-800">{totalEntries.toLocaleString()}</span> entries
      </div>

      {/* RIGHT: Rows Per Page + Page Buttons + Go to page */}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {/* Rows per page selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1 px-2 rounded-lg font-bold outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>

          </select>
        </div>

        {/* Page Buttons (Previous + numbers + Next) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ChevronLeft size={14} /> Previous
          </button>

          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentPage === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-slate-400 font-bold select-none">
                ...
              </span>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>

        {/* Go to page — only shown when there are multiple pages */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={handleJump}
              placeholder={String(currentPage)}
              className="w-14 bg-slate-50 border border-slate-200 text-slate-800 text-xs py-1.5 px-2 rounded-lg font-bold outline-none focus:border-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
