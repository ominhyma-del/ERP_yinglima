import React, { useState, useRef } from 'react';
import { Users, Plus, Shield, Search, X, CheckCircle, Download, Upload, FileSpreadsheet, Edit3, Trash2, Mail, Phone, Lock } from 'lucide-react';

export const TeamMembersPage: React.FC = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamMembers, setTeamMembers] = useState([
    {
      id: 't1',
      name: 'Yinglima Admin',
      email: 'admin@yinglima.com',
      phone: '+86 13800001111',
      role: 'Super Admin',
      branch: 'Yinglima Machinery & Trade (China HQ)',
      status: 'ACTIVE',
    },
    {
      id: 't2',
      name: 'David Musoke',
      email: 'david@fb-uganda.com',
      phone: '+256 700123456',
      role: 'Uganda Procurement Manager',
      branch: 'F&B Uganda Ingredients Ltd',
      status: 'ACTIVE',
    },
    {
      id: 't3',
      name: 'John Zhang',
      email: 'zhang@yinglima.cn',
      phone: '+86 13900112233',
      role: 'China Sourcing Specialist',
      branch: 'Yinglima Machinery & Trade (China HQ)',
      status: 'ACTIVE',
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Procurement Manager',
    branch: 'Yinglima Machinery & Trade (China HQ)',
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newMember = {
      id: `t${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '+86 13800000000',
      role: formData.role,
      branch: formData.branch,
      status: 'ACTIVE',
    };

    setTeamMembers([...teamMembers, newMember]);
    setShowDrawer(false);
    setFormData({ name: '', email: '', phone: '', role: 'Procurement Manager', branch: 'Yinglima Machinery & Trade (China HQ)' });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Branch Location', 'Status'];
    const rows = teamMembers.map((t) => [
      `"${t.name}"`,
      `"${t.email}"`,
      `"${t.phone}"`,
      `"${t.role}"`,
      `"${t.branch}"`,
      `"${t.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Team_Members_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        const imported = [
          {
            id: `t-imp-${Date.now()}`,
            name: 'Grace Akello',
            email: 'grace@one-stop.co.ug',
            phone: '+256 750987654',
            role: 'Sales Executive',
            branch: 'One Stop General Trading Uganda',
            status: 'ACTIVE',
          },
        ];
        setTeamMembers((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported team members from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team Members Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization users, multi-tenant roles & location permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Upload size={15} className="text-blue-600" /> Import
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={15} className="text-emerald-600" /> Export
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Team Member
          </button>
        </div>
      </div>

      {/* IMPORT NOTIFICATION TOAST */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="font-bold underline text-emerald-900">Dismiss</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search team member name, email or role..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <span className="text-xs text-slate-500 font-semibold">{teamMembers.length} Active Members</span>
      </div>

      {/* Team Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
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
            {teamMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3.5">
                  <p className="font-bold text-slate-900">{member.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                    <Mail size={11} className="text-blue-600" /> {member.email}
                  </p>
                </td>
                <td className="p-3.5">
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                    {member.role}
                  </span>
                </td>
                <td className="p-3.5 text-slate-700">{member.branch}</td>
                <td className="p-3.5 font-mono text-slate-600">{member.phone}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                    {member.status}
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-2">
                  <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer">
                    Edit Permissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD TEAM MEMBER DRAWER / MODAL */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-md h-full p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Team Member</h3>
                <p className="text-xs text-slate-500">Create new user account & set role permissions</p>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Li Wei"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. liwei@yinglima.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Mobile Calling Number</label>
                <input
                  type="text"
                  placeholder="+86 13800000000"
                  value={formData.phone}
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
                  <option value="Super Admin">Super Admin</option>
                  <option value="Procurement Manager">Procurement Manager</option>
                  <option value="China Sourcing Specialist">China Sourcing Specialist</option>
                  <option value="Uganda Sales Director">Uganda Sales Director</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Assigned Branch / Company</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                >
                  <option value="Yinglima Machinery & Trade (China HQ)">Yinglima Machinery & Trade (China HQ)</option>
                  <option value="F&B Uganda Ingredients Ltd">F&B Uganda Ingredients Ltd</option>
                  <option value="One Stop General Trading Uganda">One Stop General Trading Uganda</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  Save Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Team Members (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xls, .xlsx"
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
