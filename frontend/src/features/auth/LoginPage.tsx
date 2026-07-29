import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { login, sessionId, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(email, password, remember);
    if (!result.ok) setError(result.error ?? 'Login failed.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Logo / brand */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-600/30 mx-auto">
            Y
          </div>
          <h1 className="font-extrabold text-slate-900 text-xl tracking-tight mt-3">YINGLIMA</h1>
          <p className="text-xs font-bold text-blue-600 tracking-wider">PROCUREMENT • ERP</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your credentials to access the ERP system.</p>
          </div>

          {isAuthenticated && sessionId && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
              <span>Signed in — session <span className="font-mono font-semibold">{sessionId}</span></span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                Remember me on this device
              </label>
              <button type="button" className="text-xs text-blue-600 hover:underline cursor-pointer">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle size={13} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Sign In
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowDemoHelp((v) => !v)}
            className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center gap-1"
          >
            <Info size={11} /> {showDemoHelp ? 'Hide demo accounts' : 'Show demo accounts'}
          </button>
          {showDemoHelp && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Demo accounts (mock auth — not a real backend yet)</p>
              {DEMO_ACCOUNTS.map((a) => (
                <div key={a.email} className="flex items-center justify-between font-mono">
                  <span>{a.email}</span>
                  <span className="text-slate-400">{a.password}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          This is a mock sign-in for demo purposes. Sessions are stored in your browser only.
        </p>
      </div>
    </div>
  );
};
