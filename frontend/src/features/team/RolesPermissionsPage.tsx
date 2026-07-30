import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle, RefreshCw, Crown, UserCog, ShieldAlert } from 'lucide-react';
import {
  useTeamStore, PERMISSION_MODULES, emptyPermissionSet, fullPermissionSet, PermissionSet, TeamMember,
} from './teamStore';
import { useAuth } from '../auth/AuthContext';

export const RolesPermissionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { members, setPermissions } = useTeamStore();
  const isAdmin = currentUser?.accountType === 'ADMIN';

  const employees = members.filter((m) => m.accountType === 'EMPLOYEE');
  const [selectedId, setSelectedId] = useState<string | null>(employees[0]?.id ?? null);
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;
  const [savedToast, setSavedToast] = useState(false);
  const [draft, setDraft] = useState<PermissionSet | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center space-y-3 max-w-lg mx-auto mt-10">
        <ShieldAlert size={32} className="mx-auto text-amber-500" />
        <h3 className="text-base font-bold text-slate-900">Admin Access Required</h3>
        <p className="text-xs text-slate-500">Only Admin accounts can view or edit permissions. Contact your administrator if you believe you should have access.</p>
      </div>
    );
  }

  const activeDraft = draft ?? selectedMember?.permissions ?? emptyPermissionSet();

  const selectMember = (m: TeamMember) => {
    setSelectedId(m.id);
    setDraft(null);
  };

  const toggle = (moduleKey: string, action: 'view' | 'edit' | 'delete') => {
    setDraft({
      ...activeDraft,
      [moduleKey]: { ...activeDraft[moduleKey], [action]: !activeDraft[moduleKey]?.[action] },
    });
  };

  const setAllForModule = (moduleKey: string, value: boolean) => {
    setDraft({ ...activeDraft, [moduleKey]: { view: value, edit: value, delete: value } });
  };

  const resetToEmpty = () => setDraft(emptyPermissionSet());
  const resetToFull = () => setDraft(fullPermissionSet());

  const handleSave = () => {
    if (!selectedMember) return;
    setPermissions(selectedMember.id, activeDraft);
    setDraft(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const totalGranted = (m: TeamMember) =>
    Object.values(m.permissions).reduce((sum, p) => sum + (p.view ? 1 : 0) + (p.edit ? 1 : 0) + (p.delete ? 1 : 0), 0);
  const totalPerms = PERMISSION_MODULES.length * 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roles & Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin accounts always have full access. Set View / Edit / Delete per module for each Employee below.
          </p>
        </div>
      </div>

      {savedToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs shadow-sm">
          <CheckCircle size={16} className="text-emerald-600" /> Permissions saved for "{selectedMember?.name}".
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Member Selector Sidebar */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4 h-fit">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admins (full access)</h3>
            <div className="space-y-1.5">
              {members.filter((m) => m.accountType === 'ADMIN').map((m) => (
                <div key={m.id} className="w-full text-left p-3 rounded-lg text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Crown size={12} /> {m.name}</span>
                  <Lock size={12} className="text-amber-400" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employees</h3>
            <div className="space-y-1.5">
              {employees.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className={`w-full text-left p-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedId === m.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><UserCog size={12} className="text-slate-400" /> {m.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{totalGranted(m)}/{totalPerms}</span>
                </button>
              ))}
              {employees.length === 0 && (
                <p className="text-[11px] text-slate-400 px-1">No employee accounts yet. Add one from Team Members.</p>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="md:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
          {!selectedMember ? (
            <p className="text-xs text-slate-400 text-center py-10">Select an employee to view or edit permissions.</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600" /> Permissions for "{selectedMember.name}"
                  </h3>
                  <p className="text-xs text-slate-500">{selectedMember.department} · {selectedMember.branch}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={resetToEmpty} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw size={12} /> Clear All
                  </button>
                  <button onClick={resetToFull} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer">
                    Grant All
                  </button>
                  <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer">
                    Save Permissions
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-bold text-slate-500 uppercase text-[10px]">Module</th>
                      <th className="p-3 font-bold text-slate-500 uppercase text-[10px] w-20 text-center">View</th>
                      <th className="p-3 font-bold text-slate-500 uppercase text-[10px] w-20 text-center">Edit</th>
                      <th className="p-3 font-bold text-slate-500 uppercase text-[10px] w-20 text-center">Delete</th>
                      <th className="p-3 font-bold text-slate-500 uppercase text-[10px] w-24 text-center">All</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PERMISSION_MODULES.map((mod) => {
                      const p = activeDraft[mod.key] ?? { view: false, edit: false, delete: false };
                      const allSet = p.view && p.edit && p.delete;
                      return (
                        <tr key={mod.key} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{mod.label}</td>
                          {(['view', 'edit', 'delete'] as const).map((action) => (
                            <td key={action} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={!!p[action]}
                                onChange={() => toggle(mod.key, action)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setAllForModule(mod.key, !allSet)}
                              className="text-[10px] text-slate-400 hover:text-blue-600 font-semibold cursor-pointer"
                            >
                              {allSet ? 'Clear' : 'Select all'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
