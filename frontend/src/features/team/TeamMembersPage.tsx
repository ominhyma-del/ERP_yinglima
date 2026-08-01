import React, { useState, useRef, useMemo } from 'react';
import {
  Users, Plus, Search, X, CheckCircle, Download, Upload, FileSpreadsheet,
  Trash2, Mail, Eye, EyeOff, ArrowLeft, Pencil, ShieldAlert, ShieldCheck,
  Building2, Calendar, KeyRound, AlertTriangle, RefreshCw, Crown, UserCog,
  ArrowUpDown, ArrowUp, ArrowDown, Layers,
} from 'lucide-react';
import {
  useTeamStore, TeamMember, AccountType, Department, DEPARTMENTS, BRANCHES,
  PERMISSION_MODULES, emptyPermissionSet, fullPermissionSet, PermissionSet,
} from './teamStore';
import { useAuth } from '../auth/AuthContext';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { teamApi, OwnedDataSummary } from '../../api/teamApi';
import { Pagination } from '../../components/common/Pagination';

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-800">
      <CheckCircle size={16} className="text-emerald-600" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer"><X size={14} /></button>
    </div>
  );
}

function AccountTypeBadge({ type }: { type: AccountType }) {
  return type === 'ADMIN' ? (
    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
      <Crown size={10} /> ADMIN
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] flex items-center gap-1 w-fit">
      <UserCog size={10} /> EMPLOYEE
    </span>
  );
}

function MiniPermissionEditor({
  permissions, onChange,
}: {
  permissions: PermissionSet;
  onChange: (p: PermissionSet) => void;
}) {
  const toggle = (moduleKey: string, action: 'view' | 'edit' | 'delete') => {
    onChange({
      ...permissions,
      [moduleKey]: { ...permissions[moduleKey], [action]: !permissions[moduleKey]?.[action] },
    });
  };
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left p-2.5 font-bold text-slate-500 uppercase text-[10px]">Module</th>
            <th className="p-2.5 font-bold text-slate-500 uppercase text-[10px] w-16 text-center">View</th>
            <th className="p-2.5 font-bold text-slate-500 uppercase text-[10px] w-16 text-center">Edit</th>
            <th className="p-2.5 font-bold text-slate-500 uppercase text-[10px] w-16 text-center">Delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {PERMISSION_MODULES.map((mod) => (
            <tr key={mod.key} className="hover:bg-slate-50">
              <td className="p-2.5 font-medium text-slate-800">{mod.label}</td>
              {(['view', 'edit', 'delete'] as const).map((action) => (
                <td key={action} className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!permissions[mod.key]?.[action]}
                    onChange={() => toggle(mod.key, action)}
                    className="rounded cursor-pointer w-3.5 h-3.5"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TeamMembersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { members, isLoading, addMember, updateMember, removeMember, setAccountType } = useTeamStore();
  const isAdmin = currentUser?.accountType === 'ADMIN';

  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmPromote, setConfirmPromote] = useState<{ id: string; to: AccountType } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    accountType: 'EMPLOYEE' as AccountType,
    department: 'Purchase / Procurement' as Department,
    branch: BRANCHES[0] as string,
    password: genPassword(),
    permissions: emptyPermissionSet(),
  });
  const [showAddPassword, setShowAddPassword] = useState(true);

  const [editData, setEditData] = useState<TeamMember | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center space-y-3 max-w-lg mx-auto mt-10">
        <ShieldAlert size={32} className="mx-auto text-amber-500" />
        <h3 className="text-base font-bold text-slate-900">Admin Access Required</h3>
        <p className="text-xs text-slate-500">Only Admin accounts can view or manage Team Members. Contact your administrator if you believe you should have access.</p>
      </div>
    );
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.department.toLowerCase().includes(q);
  });

  // Column Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMembers = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a: any, b: any) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    });
  }, [filtered, sortField, sortDirection]);

  // Pagination State (Max 100 data per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedMembers.slice(startIndex, startIndex + pageSize);
  }, [sortedMembers, currentPage, pageSize]);

  const renderSortHeader = (label: string, field: string) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="p-3.5 select-none cursor-pointer hover:bg-slate-200/70 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="p-0.5 text-slate-500">
            {isActive ? (
              sortDirection === 'asc' ? (
                <ArrowUp size={14} className="text-blue-600 font-bold" />
              ) : (
                <ArrowDown size={14} className="text-blue-600 font-bold" />
              )
            ) : (
              <ArrowUpDown size={14} className="text-slate-400 group-hover:text-slate-700" />
            )}
          </span>
          <span>{label}</span>
        </div>
      </th>
    );
  };

  const openDetail = (m: TeamMember) => {
    setSelectedId(m.id);
    setResetPasswordValue(null);
    setView('detail');
  };

  const handleResetPassword = async (m: TeamMember) => {
    setResettingPassword(true);
    try {
      const newPassword = genPassword();
      await updateMember(m.id, { password: newPassword });
      setResetPasswordValue(newPassword);
      setToast(`Password reset for "${m.name}". Share the new password with them securely.`);
    } catch (err: any) {
      setMinAdminRuleAlert(extractErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setResettingPassword(false);
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditData({ ...m });
    setSelectedId(m.id);
    setShowEditPassword(false);
    setView('edit');
  };

  const extractErrorMessage = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message || err?.message || fallback;
    return Array.isArray(msg) ? msg.join('\n') : String(msg);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    try {
      await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '+86 13800000000',
        password: formData.password,
        accountType: formData.accountType,
        department: formData.department,
        branch: formData.branch,
        status: 'ACTIVE',
        permissions: formData.accountType === 'ADMIN' ? fullPermissionSet() : formData.permissions,
      });
      setShowAddDrawer(false);
      setFormData({
        name: '', email: '', phone: '', accountType: 'EMPLOYEE', department: 'Purchase / Procurement',
        branch: BRANCHES[0], password: genPassword(), permissions: emptyPermissionSet(),
      });
      setShowAddPassword(true);
      setToast('Team member created successfully.');
    } catch (err: any) {
      setMinAdminRuleAlert(extractErrorMessage(err, 'Failed to create team member.'));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      await updateMember(editData.id, editData);
      setToast('Team member updated successfully.');
      setView('detail');
    } catch (err: any) {
      setMinAdminRuleAlert(extractErrorMessage(err, 'Failed to update team member.'));
    }
  };

  const toggleStatus = async (m: TeamMember) => {
    if (m.isDefaultAdmin) {
      setToast('The default admin account cannot be deactivated.');
      return;
    }
    try {
      await updateMember(m.id, { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    } catch (err: any) {
      setMinAdminRuleAlert(extractErrorMessage(err, 'This action is not allowed.'));
    }
  };

  const handlePromoteRequest = (m: TeamMember, to: AccountType) => {
    setConfirmPromote({ id: m.id, to });
  };

  const confirmPromoteAction = async () => {
    if (!confirmPromote) return;
    try {
      await setAccountType(confirmPromote.id, confirmPromote.to);
      setToast(`Account ${confirmPromote.to === 'ADMIN' ? 'promoted to Admin' : 'changed to Employee'}.`);
      if (editData && editData.id === confirmPromote.id) {
        setEditData({ ...editData, accountType: confirmPromote.to, permissions: confirmPromote.to === 'ADMIN' ? fullPermissionSet() : editData.permissions });
      }
    } catch (err: any) {
      setMinAdminRuleAlert(extractErrorMessage(err, 'This action is not allowed.'));
    } finally {
      setConfirmPromote(null);
    }
  };

  const [deleteTransferModal, setDeleteTransferModal] = useState<{
    isOpen: boolean;
    userToDelete?: TeamMember;
    targetUserId: string;
  }>({ isOpen: false, targetUserId: '' });

  // Data preview shown inside the delete/transfer modal — fetched fresh from
  // the backend each time the modal opens, so the admin sees real, current
  // record counts and a real list of eligible recipients instead of picking
  // a transfer target blind.
  const [ownedDataSummary, setOwnedDataSummary] = useState<OwnedDataSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [minAdminRuleAlert, setMinAdminRuleAlert] = useState<string | null>(null);

  const handleDeleteRequest = async (m: TeamMember) => {
    if (m.isDefaultAdmin) {
      setToast('The default admin account cannot be removed.');
      return;
    }

    const activeAdmins = members.filter((x) => x.accountType === 'ADMIN' && x.status === 'ACTIVE');
    if (m.accountType === 'ADMIN' && activeAdmins.length <= 1) {
      setMinAdminRuleAlert(
        `Action Blocked: Minimum 1 active Administrator is required in the system. You cannot delete the last remaining Admin account (${m.name}).`,
      );
      return;
    }

    // Open the modal immediately in a loading state, then fetch the real
    // data-ownership summary from the backend. This is what lets the admin
    // see exactly how many suppliers/buyers/products/inquiries this account
    // owns, and pick a transfer target from the actual list of eligible
    // active users (admin or not), instead of guessing from stale local state.
    setDeleteTransferModal({ isOpen: true, userToDelete: m, targetUserId: '' });
    setOwnedDataSummary(null);
    setSummaryError(null);
    setIsLoadingSummary(true);

    try {
      const summary = await teamApi.getOwnedDataSummary(m.id);
      setOwnedDataSummary(summary);
      const defaultTarget = summary.eligibleTransferTargets[0];
      setDeleteTransferModal((prev) => ({ ...prev, targetUserId: defaultTarget ? defaultTarget.id : '' }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load data ownership summary.';
      setSummaryError(Array.isArray(msg) ? msg.join('\n') : String(msg));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const confirmDeleteAndTransfer = async () => {
    if (!deleteTransferModal.userToDelete || !deleteTransferModal.targetUserId) return;
    const { userToDelete, targetUserId } = deleteTransferModal;
    const targetUser = ownedDataSummary?.eligibleTransferTargets.find((x) => x.id === targetUserId);

    try {
      await removeMember(userToDelete.id, targetUserId);
      setDeleteTransferModal({ isOpen: false, targetUserId: '' });
      setOwnedDataSummary(null);
      setToast(`Account "${userToDelete.name}" deleted. All records transferred to "${targetUser?.full_name || 'Selected User'}".`);
      setView('list');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete account.';
      setMinAdminRuleAlert(Array.isArray(msg) ? msg.join('\n') : String(msg));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Account Type', 'Department', 'Branch Location', 'Status'];
    const rows = members.map((t) => [`"${t.name}"`, `"${t.email}"`, `"${t.phone}"`, `"${t.accountType}"`, `"${t.department}"`, `"${t.branch}"`, `"${t.status}"`]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Yinglima_Team_Members_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        addMember({
          name: 'Grace Akello', email: 'grace@one-stop.co.ug', phone: '+256 750987654',
          accountType: 'EMPLOYEE', department: 'Sales & Buyers', branch: 'One Stop General Trading Uganda',
          status: 'ACTIVE', password: genPassword(), permissions: emptyPermissionSet(),
        });
        setShowImportModal(false);
        setImportNotification(`Successfully imported team members from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  // Bulk selection & Merge State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [targetMergeId, setTargetMergeId] = useState<string>('');

  const isAllSelected = sortedMembers.length > 0 && sortedMembers.every((m) => selectedIds.includes(m.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedMembers.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // NOTE: bulk delete intentionally does NOT call removeMember() directly.
  // The backend requires a mandatory data-ownership transfer target for every
  // single deletion (see UserService.remove()) — there is no bulk-transfer
  // endpoint, and building one would mean guessing how to split one account's
  // suppliers/buyers/products/inquiries across multiple recipients, which is
  // exactly the kind of ambiguous, silent-data-risk shortcut this feature
  // exists to prevent. Instead, "bulk delete" opens the same single-account
  // preview-and-transfer modal used everywhere else, starting with the first
  // selected member — each deletion still requires an explicit, informed
  // transfer-target choice, it just chains through the selection one at a time.
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const firstMember = members.find((m) => m.id === selectedIds[0]);
    if (!firstMember) return;
    setSelectedIds((prev) => prev.filter((id) => id !== selectedIds[0]));
    handleDeleteRequest(firstMember);
  };

  const handleOpenMerge = () => {
    if (selectedIds.length < 2) {
      alert('Please select at least 2 team members to merge.');
      return;
    }
    setTargetMergeId(selectedIds[0]);
    setShowMergeModal(true);
  };

  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Each account being merged away has its data transferred to targetMergeId
  // via the SAME mandatory-transfer path used everywhere else in this page —
  // the backend logs each transfer on both sides (see UserService.remove()).
  // This previously called removeMember(id) with no target at all, which
  // means the backend would have rejected every single deletion (it requires
  // targetUserId) — so "merge" never actually worked, it just looked like it
  // did because failures weren't surfaced. Run sequentially and awaited so
  // one failure doesn't leave the account list in a half-merged, unclear state.
  const handleExecuteMerge = async () => {
    if (!targetMergeId) return;
    const targetMember = members.find((m) => m.id === targetMergeId);
    if (!targetMember) return;

    const idsToMerge = selectedIds.filter((id) => id !== targetMergeId);
    setIsMerging(true);
    setMergeError(null);

    let mergedCount = 0;
    try {
      for (const id of idsToMerge) {
        await removeMember(id, targetMergeId);
        mergedCount++;
      }
      setSelectedIds([]);
      setShowMergeModal(false);
      setImportNotification(`Merged ${mergedCount} account(s) into "${targetMember.name}". All their records were transferred.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to merge remaining accounts.';
      setMergeError(
        `${mergedCount} of ${idsToMerge.length} account(s) were merged before this error occurred: ${Array.isArray(msg) ? msg.join('\n') : String(msg)}`,
      );
      // Drop the ones already merged from the selection so retrying only
      // targets what's left, rather than re-attempting completed transfers.
      setSelectedIds((prev) => prev.filter((id) => id === targetMergeId || idsToMerge.indexOf(id) >= mergedCount));
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* MINIMUM 1 ADMIN RULE ALERT */}
      {minAdminRuleAlert && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600 flex-shrink-0" />
            <span className="font-medium">{minAdminRuleAlert}</span>
          </div>
          <button onClick={() => setMinAdminRuleAlert(null)} className="font-bold underline text-rose-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* USER DELETION & DATA OWNERSHIP TRANSFER MODAL */}
      {deleteTransferModal.isOpen && deleteTransferModal.userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={20} className="text-rose-600" /> Delete User & Transfer Data Ownership
              </h3>
              <button
                onClick={() => {
                  setDeleteTransferModal({ isOpen: false, targetUserId: '' });
                  setOwnedDataSummary(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              You are about to delete <strong>{deleteTransferModal.userToDelete.name}</strong> ({deleteTransferModal.userToDelete.email}).
              <br /><br />
              <strong>Mandatory Enterprise Rule:</strong> All historical database records (Suppliers, Buyers, Products, Inquiries) created by this user must be reassigned to a responsible active team member.
            </div>

            {isLoadingSummary && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-2">
                <RefreshCw size={14} className="animate-spin" /> Loading data ownership summary...
              </div>
            )}

            {summaryError && !isLoadingSummary && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium">
                {summaryError}
              </div>
            )}

            {ownedDataSummary && !isLoadingSummary && (
              <>
                {/* Real, current counts of exactly what this account owns —
                    fetched fresh from the backend, not estimated from cached
                    local state, so nothing is transferred blind. */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Records That Will Be Transferred:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{ownedDataSummary.ownedRecords.suppliers}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Suppliers</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{ownedDataSummary.ownedRecords.buyers}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Buyers</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{ownedDataSummary.ownedRecords.products}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Products</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-900">{ownedDataSummary.ownedRecords.inquiries}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Inquiries</p>
                    </div>
                  </div>
                  {ownedDataSummary.ownedRecords.total === 0 && (
                    <p className="text-[11px] text-slate-400 italic px-1">
                      This account currently owns no records — a transfer target is still required by policy.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Select Responsible User / Admin to Receive Data:</label>
                  <select
                    value={deleteTransferModal.targetUserId}
                    onChange={(e) => setDeleteTransferModal((prev) => ({ ...prev, targetUserId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ownedDataSummary.eligibleTransferTargets.length === 0 && (
                      <option value="">No eligible active team members available</option>
                    )}
                    {ownedDataSummary.eligibleTransferTargets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role} — {m.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteTransferModal({ isOpen: false, targetUserId: '' });
                  setOwnedDataSummary(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAndTransfer}
                disabled={isLoadingSummary || !deleteTransferModal.targetUserId}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
              >
                Transfer Data & Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {view === 'list' ? 'Team Members Directory' : view === 'detail' ? 'Member Details' : 'Edit Team Member'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {view === 'list' ? 'Manage Admin & Employee accounts, departments and per-module permissions' : 'Yinglima Team & Access Management'}
          </p>
        </div>

        {view === 'list' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImportModal(true)} className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Upload size={15} className="text-blue-600" /> Import
            </button>
            <button onClick={handleExportCSV} className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Download size={15} className="text-emerald-600" /> Export
            </button>
            <button onClick={() => setShowAddDrawer(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Plus size={16} /> Add Team Member
            </button>
          </div>
        ) : (
          <button onClick={() => setView('list')} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
            <ArrowLeft size={14} /> Back to List
          </button>
        )}
        {/* MERGE TEAM MEMBERS MODAL */}
        {showMergeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" /> Merge Selected Team Members ({selectedIds.length})
                </h3>
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeError(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Select the <strong>primary team member account</strong> to keep. All Suppliers, Buyers, Products, and Inquiries owned by every
                other selected account will be transferred to the primary account, and each account will then be deleted.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Primary Account Record to Keep:</label>
                <select
                  value={targetMergeId}
                  onChange={(e) => setTargetMergeId(e.target.value)}
                  disabled={isMerging}
                  className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 p-2.5 rounded-xl font-semibold outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {members
                    .filter((m) => selectedIds.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              {mergeError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium whitespace-pre-line">
                  {mergeError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeError(null);
                  }}
                  disabled={isMerging}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  disabled={isMerging}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isMerging ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
                  {isMerging ? 'Transferring & Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="font-bold underline text-emerald-900 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team member name, email or department..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">{filtered.length} Member{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* BULK ACTION BAR */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle size={16} className="text-blue-600" />
                <span>{selectedIds.length} team member(s) selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenMerge}
                  disabled={selectedIds.length < 2}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Layers size={14} /> Merge Selected ({selectedIds.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Delete Selected ({selectedIds.length})
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 cursor-pointer w-4 h-4"
                      />
                    </th>
                    {renderSortHeader('Member Name & Email', 'name')}
                    {renderSortHeader('Account Type', 'accountType')}
                    {renderSortHeader('Department', 'department')}
                    {renderSortHeader('Branch / Company', 'branch')}
                    {renderSortHeader('Status', 'status')}
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className={`transition-colors ${selectedIds.includes(member.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(member.id)}
                          onChange={() => toggleSelectOne(member.id)}
                          className="rounded border-slate-300 cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="p-3.5 cursor-pointer" onClick={() => openDetail(member)}>
                        <p className="font-bold text-blue-600 hover:underline">{member.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="text-blue-600" /> {member.email}
                        </p>
                      </td>
                      <td className="p-3.5"><AccountTypeBadge type={member.accountType} /></td>
                      <td className="p-3.5 text-slate-700">{member.department}</td>
                      <td className="p-3.5 text-slate-700">{member.branch}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => toggleStatus(member)}
                          className={`px-2 py-0.5 font-bold rounded text-[10px] cursor-pointer ${member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                        >
                          {member.status}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button onClick={() => openDetail(member)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer">
                          View
                        </button>
                        <button onClick={() => openEdit(member)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold cursor-pointer">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">No team members found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER CONTROL */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedMembers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        )}
        </>
      )}

      {/* ── DETAIL VIEW ── */}
      {view === 'detail' && selectedMember && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={() => openEdit(selectedMember)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Pencil size={13} /> Edit Member
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Member Information</h3>
                  </div>
                  <AccountTypeBadge type={selectedMember.accountType} />
                </div>
                <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Full Name</p>
                    <p className="font-semibold text-slate-900">{selectedMember.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Email Address</p>
                    <p className="font-semibold text-slate-900">{selectedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Phone Number</p>
                    <p className="font-semibold text-slate-900 font-mono">{selectedMember.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Department</p>
                    <p className="font-semibold text-slate-900">{selectedMember.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Branch / Company</p>
                    <p className="font-semibold text-slate-900">{selectedMember.branch}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Status</p>
                    <p className={`font-semibold ${selectedMember.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`}>{selectedMember.status}</p>
                  </div>
                </div>

                {/* Promote / demote control */}
                <div className="px-5 pb-5">
                  {selectedMember.isDefaultAdmin ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 text-[11px] flex items-center gap-2">
                      <Crown size={13} /> This is the default system admin and always retains full Admin access.
                    </div>
                  ) : selectedMember.accountType === 'EMPLOYEE' ? (
                    <button
                      onClick={() => handlePromoteRequest(selectedMember, 'ADMIN')}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Crown size={13} /> Promote to Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePromoteRequest(selectedMember, 'EMPLOYEE')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCog size={13} /> Change to Employee
                    </button>
                  )}
                </div>
              </div>

              {/* Password section */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <KeyRound size={15} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Account Password</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-[11px] flex items-start gap-2">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Passwords are hashed with bcrypt and never leave the server — there is nothing to reveal here.
                      Use "Reset Password" to issue this member a brand-new password.
                    </span>
                  </div>
                  {resetPasswordValue ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 font-mono text-sm text-emerald-900 font-bold tracking-wide select-all">
                        {resetPasswordValue}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold">New — share this once</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleResetPassword(selectedMember)}
                      disabled={resettingPassword}
                      className="w-full px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound size={13} /> {resettingPassword ? 'Resetting…' : 'Reset Password'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <Calendar size={15} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Account Info</h3>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Calendar size={13} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-500 font-medium">Created Date</p>
                      <p className="font-semibold text-slate-800">{selectedMember.createdDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Building2 size={13} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-500 font-medium">Branch</p>
                      <p className="font-semibold text-slate-800">{selectedMember.branch}</p>
                    </div>
                  </div>
                </div>
              </div>

              {!selectedMember.isDefaultAdmin && (
                <button
                  onClick={() => handleDeleteRequest(selectedMember)}
                  className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} /> Remove Member
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT VIEW ── */}
      {view === 'edit' && editData && (
        <form onSubmit={handleSaveEdit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name <span className="text-rose-500">*</span></label>
              <input
                type="text" required value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address <span className="text-rose-500">*</span></label>
              <input
                type="email" required value={editData.email}
                disabled={editData.isDefaultAdmin}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text" value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
              <select
                value={editData.department}
                disabled={editData.isDefaultAdmin}
                onChange={(e) => setEditData({ ...editData, department: e.target.value as Department })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Branch / Company</label>
              <select
                value={editData.branch}
                onChange={(e) => setEditData({ ...editData, branch: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
              >
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={editData.status}
                disabled={editData.isDefaultAdmin}
                onChange={(e) => setEditData({ ...editData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Account type control */}
          <div className="border-t border-slate-100 pt-5">
            <label className="text-xs font-semibold text-slate-700 block mb-2">Account Type</label>
            {editData.isDefaultAdmin ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 text-xs flex items-center gap-2">
                <Crown size={14} /> Default system admin — always full Admin access, cannot be changed.
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, accountType: 'EMPLOYEE' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${editData.accountType === 'EMPLOYEE' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <UserCog size={13} /> Employee
                </button>
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, accountType: 'ADMIN', permissions: fullPermissionSet() })}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${editData.accountType === 'ADMIN' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <Crown size={13} /> Admin (full access)
                </button>
              </div>
            )}
          </div>

          {/* Password field */}
          <div className="border-t border-slate-100 pt-5">
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
              <KeyRound size={13} className="text-slate-400" /> Password
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editData.password || ''}
                  placeholder="Leave blank to keep current password"
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 pr-9 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setEditData({ ...editData, password: genPassword() }); setShowEditPassword(true); }}
                title="Generate a new password"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer flex-shrink-0"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">The current password is never shown (it's hashed). Leave this blank to keep it unchanged, or type/generate a new one to reset it.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setView('detail')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5">
              <CheckCircle size={14} /> Save Changes
            </button>
          </div>
        </form>
      )}

      {/* ── ADD MEMBER DRAWER ── */}
      {showAddDrawer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-md h-full p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Team Member</h3>
                <p className="text-xs text-slate-500">Create new user account, department & permissions</p>
              </div>
              <button onClick={() => setShowAddDrawer(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text" required placeholder="e.g. Li Wei" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Email Address <span className="text-rose-500">*</span></label>
                <input
                  type="email" required placeholder="e.g. liwei@yinglima.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Mobile Calling Number</label>
                <input
                  type="text" placeholder="+86 13800000000" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Account Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'EMPLOYEE' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer flex items-center justify-center gap-1.5 ${formData.accountType === 'EMPLOYEE' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                  >
                    <UserCog size={13} /> Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'ADMIN' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer flex items-center justify-center gap-1.5 ${formData.accountType === 'ADMIN' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                  >
                    <Crown size={13} /> Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Assigned Branch / Company</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                >
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>



              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-slate-400" /> Initial Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 pr-9 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: genPassword() })}
                    title="Generate a new password"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer flex-shrink-0"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddDrawer(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">
                  Save Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Team Members (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing team user records.</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 p-6 rounded-xl text-center cursor-pointer space-y-2 transition-all"
              >
                <FileSpreadsheet size={32} className="mx-auto text-blue-600" />
                <p className="font-semibold text-slate-800">Click to select CSV or Excel File</p>
                <p className="text-[11px] text-slate-400">Supports .csv, .xls, .xlsx</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .xls, .xlsx" className="hidden" />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Promote / Demote ── */}
      {confirmPromote && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              {confirmPromote.to === 'ADMIN' ? <Crown size={22} className="text-amber-500 flex-shrink-0 mt-0.5" /> : <ShieldAlert size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />}
              <p className="text-sm text-slate-700 font-medium">
                {confirmPromote.to === 'ADMIN'
                  ? 'Grant this employee full Admin access, including the ability to manage all team members and permissions?'
                  : 'Remove Admin access from this account and revert to Employee-level permissions?'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setConfirmPromote(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              <button onClick={confirmPromoteAction} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 font-medium">Are you sure you want to remove this team member? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
              <button onClick={confirmDeleteAndTransfer} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer">Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
};