import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  FileText,
  Lock,
  User,
  Shield,
  LogOut,
  LogIn,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

export const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.accountType === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Live Audit Logs from PostgreSQL Database (100% Immutable & Non-Editable)
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLiveAuditLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audit/logs');
      const data = response.data?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        setLogs(data);
      } else {
        const saved = localStorage.getItem('yinglima_audit_logs');
        setLogs(saved ? JSON.parse(saved) : []);
      }
    } catch (err) {
      const saved = localStorage.getItem('yinglima_audit_logs');
      setLogs(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLiveAuditLogs();
    }
  }, [isAdmin]);

  const handleRefresh = () => {
    fetchLiveAuditLogs();
  };

  // Distinct User Emails / Names for Filter Dropdown
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    logs.forEach((log) => {
      const email = log.user_email || log.user?.email || 'Unknown User';
      const name = log.user_name || log.user?.full_name || email;
      userMap.set(email, name);
    });
    return Array.from(userMap.entries()).map(([email, name]) => ({ email, name }));
  }, [logs]);

  // Distinct Action Types for Filter Dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach((log) => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      // 1. User Filter
      if (selectedUserFilter !== 'ALL') {
        const userEmail = (log.user_email || log.user?.email || '').toLowerCase();
        if (userEmail !== selectedUserFilter.toLowerCase()) return false;
      }

      // 2. Action Filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // 3. Search Term Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const emailMatch = (log.user_email || '').toLowerCase().includes(term);
        const nameMatch = (log.user_name || '').toLowerCase().includes(term);
        const descMatch = (log.description || '').toLowerCase().includes(term);
        const actionMatch = (log.action || '').toLowerCase().includes(term);
        const ipMatch = (log.ip_address || '').toLowerCase().includes(term);
        if (!emailMatch && !nameMatch && !descMatch && !actionMatch && !ipMatch) return false;
      }

      return true;
    });
  }, [logs, selectedUserFilter, actionFilter, searchTerm]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User Name', 'User Email', 'Role', 'Action', 'Entity', 'IP Address', 'Activity Description'];
    const rows = filteredLogs.map((l: any) => [
      `"${l.timestamp}"`,
      `"${l.user_name || 'System User'}"`,
      `"${l.user_email || ''}"`,
      `"${l.role || 'USER'}"`,
      `"${l.action || ''}"`,
      `"${l.entity || ''}"`,
      `"${l.ip_address || ''}"`,
      `"${l.description || ''}"`,
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

  // ADMIN ACCESS GUARD — ONLY ADMIN CAN VIEW GLOBAL AUDIT LOGS
  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm my-12">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted — Admin Only</h2>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed">
            Global Audit Trace Logs, Login Histories, and System Activity Records are strictly restricted to System Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert size={22} className="text-blue-600" /> Audit Trace Logs & User Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System Security Audit Trail, Login/Logout Histories & Real-time Action Tracking (Admin View)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-blue-600' : ''} /> Refresh Logs
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={14} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* 1. FILTER BY TEAM MEMBER / EMAIL */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <User size={12} className="text-blue-600" /> Filter by Team Member / Email:
          </label>
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Team Members ({uniqueUsers.length} Users)</option>
            {uniqueUsers.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* 2. FILTER BY ACTION */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Shield size={12} className="text-indigo-600" /> Filter by Action Type:
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All System Actions ({uniqueActions.length} Actions)</option>
            <option value="LOGIN_SUCCESS">Login Success (LOGIN_SUCCESS)</option>
            <option value="LOGOUT_SUCCESS">Logout (LOGOUT_SUCCESS)</option>
            {uniqueActions
              .filter((a) => a !== 'LOGIN_SUCCESS' && a !== 'LOGOUT_SUCCESS')
              .map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
          </select>
        </div>

        {/* 3. SEARCH BAR */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Search size={12} className="text-slate-400" /> Search Activity Log:
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, name, IP, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-xs pl-9 pr-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* LOGS TABLE (READ-ONLY / IMMUTABLE) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User Name & Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity Affected</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Activity Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="font-semibold text-xs">Loading Live Immutable Audit Logs...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldAlert size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-semibold text-xs">No matching audit trace logs found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => {
                  const isLogin = log.action === 'LOGIN_SUCCESS';
                  const isLogout = log.action === 'LOGOUT_SUCCESS';
                  const isDelete = log.action?.includes('DELETE');
                  const isTransfer = log.action?.includes('TRANSFER') || log.action?.includes('REASSIGN');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{log.user_name || 'System User'}</p>
                        <p className="text-[11px] text-blue-600 font-mono">{log.user_email || '—'}</p>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            log.role === 'ADMIN' || log.role === 'SUPER_ADMIN'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {log.role || 'USER'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg inline-flex items-center gap-1 border ${
                            isLogin
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isLogout
                              ? 'bg-slate-100 border-slate-300 text-slate-700'
                              : isDelete
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : isTransfer
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                        >
                          {isLogin && <LogIn size={11} />}
                          {isLogout && <LogOut size={11} />}
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-xs text-slate-700 font-semibold">{log.entity || 'SYSTEM'}</td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>

                      <td className="p-3.5 text-xs text-slate-800 font-medium max-w-md break-words">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
