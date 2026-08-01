import React from 'react';
import { AlertTriangle, X, Trash2, SkipForward, ShieldAlert } from 'lucide-react';

export interface BulkDeleteBlockedRecord {
  id: string;
  name: string;
  reasons: string[];
}

export interface BulkDeleteResultLike {
  deleted: { id: string; name: string }[];
  blocked: BulkDeleteBlockedRecord[];
  notFound: string[];
}

interface BulkDeleteModalProps {
  /** Label for what's being deleted, e.g. "supplier", "buyer", "consignment" */
  entityLabel: string;
  /** Result of the first (non-forced) bulk-delete call. */
  result: BulkDeleteResultLike;
  /** Called when the user cancels — nothing further happens to the blocked records. */
  onCancel: () => void;
  /**
   * Called when the user chooses to force-delete the blocked records too.
   * The caller re-submits the bulk-delete request with
   * { force: true, forceIds: blocked.map(b => b.id) }.
   */
  onForceDelete: (blockedIds: string[]) => void;
  isProcessing?: boolean;
}

/**
 * Shown after a bulk-delete request comes back with some records blocked by
 * a business rule (e.g. Supplier/Buyer Status=EXISTING or Potential=YES, or
 * an Inquiry item that's Approved/Tally-posted).
 *
 * The already-deleted records are NOT re-litigated here — they're gone.
 * This dialog only asks what to do about the ones that were skipped:
 * leave them alone, or force-delete them having been shown exactly why
 * they were flagged.
 */
export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  entityLabel,
  result,
  onCancel,
  onForceDelete,
  isProcessing = false,
}) => {
  const { deleted, blocked, notFound } = result;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-600" />
            {blocked.length} {entityLabel}{blocked.length === 1 ? '' : 's'} Could Not Be Deleted
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 cursor-pointer" disabled={isProcessing}>
            <X size={16} />
          </button>
        </div>

        {deleted.length > 0 && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 font-semibold">
            {deleted.length} {entityLabel}{deleted.length === 1 ? '' : 's'} deleted successfully.
          </p>
        )}

        <p className="text-xs text-slate-600">
          The following {blocked.length === 1 ? 'record does' : 'records do'} not meet the mandatory conditions for deletion.
          You can skip {blocked.length === 1 ? 'it' : 'them'} and keep {blocked.length === 1 ? 'it' : 'them'} in the system, or force-delete anyway.
        </p>

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {blocked.map((b) => (
            <div key={b.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" /> {b.name}
              </p>
              <ul className="mt-1 space-y-0.5 pl-5 list-disc">
                {b.reasons.map((r, idx) => (
                  <li key={idx} className="text-[11px] text-amber-800 font-medium">{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {notFound.length > 0 && (
          <p className="text-[11px] text-slate-400 italic">
            {notFound.length} selected record(s) were already removed or not found and were skipped.
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-1.5"><SkipForward size={13} /> Skip These, Keep Them</span>
          </button>
          <button
            type="button"
            onClick={() => onForceDelete(blocked.map((b) => b.id))}
            disabled={isProcessing}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 size={14} /> {isProcessing ? 'Deleting...' : `Force Delete ${blocked.length === 1 ? 'This One' : 'All'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
