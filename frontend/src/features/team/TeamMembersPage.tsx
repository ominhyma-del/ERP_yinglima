import React, { useState, useRef } from 'react';
import {
  Users, Plus, Search, X, CheckCircle, Download, Upload, FileSpreadsheet,
  Trash2, Mail, Phone, Eye, EyeOff, ArrowLeft, Pencil, ShieldAlert,
  Building2, Calendar, KeyRound, AlertTriangle, RefreshCw,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  status: 'ACTIVE' | 'INACTIVE';
  password: string;
  createdDate: string;
}

const ROLES = ['Super Admin', 'Procurement Manager', 'China Sourcing Specialist', 'Uganda Sales Director', 'Finance & Accounting'];
const BRANCHES = [
  'Yinglima Machinery & Trade (China HQ)',
  'F&B Uganda Ingredients Ltd',
  'One Stop General Trading Uganda',
  'Ingredi Trade Uganda Ltd',
  'Darsh Impex India LLP (India HQ)',
  'East Africa Chemical Supply',
];

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

export const TeamMembersPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 't1', name: 'Yinglima Admin', email: 'admin@yinglima.com', phone: '+86 13800001111',
      role: 'Super Admin', branch: 'Yinglima Machinery & Trade (China HQ)', status: 'ACTIVE',
      password: 'Admin@123', createdDate: '2025-01-05',
    },
    {
      id: 't2', name: 'David Musoke', email: 'david@fb-uganda.com', phone: '+256 700123456',
      role: 'Uganda Procurement Manager', branch: 'F&B Uganda Ingredients Ltd', status: 'ACTIVE',
      password: 'David@123', createdDate: '2025-02-11',
    },
    {
      id: 't3', name: 'John Zhang', email: 'zhang@yinglima.cn', phone: '+86 13900112233',
      role: 'China Sourcing Specialist', branch: 'Yinglima Machinery & Trade (China HQ)', status: 'ACTIVE',
      password: 'Zhang@123', createdDate: '2025-03-02',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMember = teamMembers.find((m) => m.id === selectedId) ?? null;

  const [showPasswordDetail, setShowPasswordDetail] = useState(false);

  // Add form
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'Procurement Manager',
    branch: 'Yinglima Machinery & Trade (China HQ)', password: genPassword(),
  });
  const [showAddPassword, setShowAddPassword] = useState(true);

  // Edit form
  const [editData, setEditData] = useState<TeamMember | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const filtered = teamMembers.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  const openDetail = (m: TeamMember) => {
    setSelectedId(m.id);
    setShowPasswordDetail(false);
    setView('detail');
  };

  const openEdit = (m: TeamMember) => {
    setEditData({ ...m });
    setSelectedId(m.id);
    setShowEditPassword(false);
    setView('edit');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    const newMember: TeamMember = {
      id: `t${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '+86 13800000000',
      role: formData.role,
      branch: formData.branch,
      status: 'ACTIVE',
      password: formData.password,
      createdDate: new Date().toISOString().split('T')[0],
    };
    setTeamMembers((prev) => [...prev, newMember]);
    setShowAddDrawer(false);
    setFormData({ name: '', email: '', phone: '', role: 'Procurement Manager', branch: 'Yinglima Machinery & Trade (China HQ)', password: genPassword() });
    setShowAddPassword(true);
    setToast('Team member created successfully.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    setTeamMembers((prev) => prev.map((m) => (m.id === editData.id ? editData : m)));
    setToast('Team member updated successfully.');
    setView('detail');
  };

  const toggleStatus = (id: string) => {
    setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : m)));
  };

  const handleDelete = (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    setToast('Team member removed.');
    setView('list');
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Branch Location', 'Status'];
    const rows = teamMembers.map((t) => [`"${t.name}"`, `"${t.email}"`, `"${t.phone}"`, `"${t.role}"`, `"${t.branch}"`, `"${t.status}"`]);
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
        const imported: TeamMember = {
          id: `t-imp-${Date.now()}`, name: 'Grace Akello', email: 'grace@one-stop.co.ug',
          phone: '+256 750987654', role: 'Sales Executive', branch: 'One Stop General Trading Uganda',
          status: 'ACTIVE', password: genPassword(), createdDate: new Date().toISOString().split('T')[0],
        };
        setTeamMembers((prev) => [imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported team members from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {view === 'list' ? 'Team Members Directory' : view === 'detail' ? 'Member Details' : 'Edit Team Member'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {view === 'list' ? 'Manage organization users, roles & location permissions' : 'Yinglima Team & Access Management'}
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
                placeholder="Search team member name, email or role..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">{filtered.length} Member{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Member Name & Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Assigned Branch / Company</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 cursor-pointer" onClick={() => openDetail(member)}>
                      <p className="font-bold text-blue-600 hover:underline">{member.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="text-blue-600" /> {member.email}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">{member.role}</span>
                    </td>
                    <td className="p-3.5 text-slate-700">{member.branch}</td>
                    <td className="p-3.5 font-mono text-slate-600">{member.phone}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => toggleStatus(member.id)}
                        className={`px-2 py-0.5 font-bold rounded text-[10px] cursor-pointer ${
                          member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
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
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <Users size={15} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Member Information</h3>
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
                    <p className="font-semibold text-slate-900 font-mono">{selectedMember.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium mb-0.5">Assigned Role</p>
                    <p className="font-semibold text-slate-900">{selectedMember.role}</p>
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
              </div>

              {/* Password section */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <KeyRound size={15} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Account Password</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-[11px] flex items-start gap-2">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>Passwords are shown in plain text on this internal demo build. This is not a secure pattern for production — connect real authentication (e.g. Supabase) before handling real users.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-800">
                      {showPasswordDetail ? selectedMember.password : '•'.repeat(selectedMember.password.length)}
                    </div>
                    <button
                      onClick={() => setShowPasswordDetail((v) => !v)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                      title={showPasswordDetail ? 'Hide password' : 'Show password'}
                    >
                      {showPasswordDetail ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
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

              {selectedMember.role !== 'Super Admin' && (
                <button
                  onClick={() => handleDelete(selectedMember.id)}
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
        <form onSubmit={handleSaveEdit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5 max-w-2xl">
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
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Role</label>
              <select
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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
                onChange={(e) => setEditData({ ...editData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
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
                  value={editData.password}
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
            <p className="text-[11px] text-slate-400 mt-1">Editable directly since this member's password is stored in plain text on this demo build.</p>
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
                <p className="text-xs text-slate-500">Create new user account & set role permissions</p>
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
                <label className="text-xs text-slate-700 font-semibold block mb-1">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
};
