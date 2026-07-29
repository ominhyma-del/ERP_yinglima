import { useState, useMemo } from 'react';

/**
 * Bitrix24-style bulk selection: checkbox per row + header "select all"
 * (tri-state: none / some / all) + helpers for a bulk action bar.
 */
export function useBulkSelect<T extends { id: string }>(rows: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allIds.every((id) => prev.has(id)) && allIds.length > 0) return new Set();
      return new Set(allIds);
    });
  };

  const clear = () => setSelected(new Set());

  const isSelected = (id: string) => selected.has(id);

  return {
    selected,
    selectedCount: selected.size,
    allSelected,
    someSelected,
    toggleOne,
    toggleAll,
    clear,
    isSelected,
  };
}
