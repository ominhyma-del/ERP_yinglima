import React, { useState } from 'react';
import { ShieldAlert, Search, Filter, Download, UserCheck, Calendar, Clock, CheckCircle, RefreshCw, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Load audit logs from localStorage or fallback to initial audit trace logs
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('yinglima_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        user_email: 'admin@yinglima.com',
        action: 'LOGIN_SUCCESS',
        entity: 'USER_AUTH',
        entity_id: 'usr-admin-1',
        role: 'ADMIN',
        ip_address: '127.0.0.1 (Local Session)',
        status: 'SUCCESS',
        description: 'User "admin@yinglima.com" authenticated successfully as ADMIN',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        user_email: 'admin@yinglima.com',
        action: 'UPDATE_SUPPLIER',
        entity: 'SUPPLIER_PROFILE',
        entity_id: 's1',
        role: 'ADMIN',
        ip_address: '127.0.0.1 (Local Session)',
        status: 'SUCCESS',
        description: 'Updated Supplier Profile details for "Zhejiang Packaging Machinery Ltd"',
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        user_email: 'user@yinglima.com',
        action: 'CREATE_INQUIRY',
        entity: 'INQUIRY_ITEM',
        entity_id: 'item-101',
        role: 'USER',
        ip_address: '127.0.0.1 (Local Session)',
        status: 'SUCCESS',
        description: 'Created new Inquiry requirement item "Citric Acid Anhydrous" in Consignment FB1',
      },
    ];
  });

  const handleRefresh = () => {
    const saved = localStorage.getItem('yinglima_audit_logs');
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {}
    }
  };

  const filteredLogs = logs.filter((log: any) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const emailMatch = log.user_email?.toLowerCase().includes(term);
      const descMatch = log.description?.toLowerCase().includes(term);
      const actionMatch = log.action?.toLowerCase().includes(term);
      if (!emailMatch && !descMatch && !actionMatch) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User Email', 'Role', 'Action', 'Entity', 'IP Address', 'Description'];
    const rows = filteredLogs.map((l: any) => [
      `"${l.timestamp}"`,
      `"${l.user_email}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.ip_address}"`,
      `"${l.description}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Audit_Trace_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert size={20} className="text-indigo-600" /> Audit Trace Logs & User Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System Security Audit Trail, Login Histories & Real-time Action Tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={14} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
            Action Filter:
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 p-2 rounded-lg outline-none font-bold"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGOUT">Logout</option>
            <option value="UPDATE_SUPPLIER">Update Supplier</option>
            <option value="CREATE_INQUIRY">Create Inquiry</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by email, action, text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs pl-9 pr-3 py-2 rounded-lg outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity Affected</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Activity Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-blue-600">{log.user_email}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] rounded font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{log.entity}</td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{log.ip_address}</td>
                    <td className="p-3.5 text-slate-800 font-medium">{log.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                    No audit trace logs match the search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
