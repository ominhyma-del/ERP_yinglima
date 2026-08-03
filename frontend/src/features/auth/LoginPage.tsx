import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid Email Address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your Password.');
      return;
    }

    const res = await login(email, password, rememberMe);
    if (!res.ok) {
      setError(res.error || 'Invalid login credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-10 font-sans">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT COLUMN: FIGMA VECTOR ILLUSTRATION WITH SOFT BLUE BACKGROUND */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              Y
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">YINGLIMA</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Procurement & ERP</p>
            </div>
          </div>

          {/* Center Vector Illustration matching Figma */}
          <div className="my-8 relative flex justify-center items-center">
            {/* SVG Workstation Illustration */}
            <div className="relative w-full max-w-sm">
              <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-xl">
                {/* Soft backdrop circle */}
                <circle cx="200" cy="160" r="130" fill="#E0E7FF" opacity="0.6" />
                
                {/* Floating UI Card 1 */}
                <rect x="50" y="40" width="120" height="70" rx="10" fill="#FFFFFF" />
                <rect x="65" y="55" width="40" height="25" rx="4" fill="#3B82F6" />
                <rect x="115" y="55" width="40" height="8" rx="4" fill="#93C5FD" />
                <rect x="115" y="70" width="30" height="8" rx="4" fill="#E0E7FF" />

                {/* Floating Speech Bubble */}
                <rect x="230" y="25" width="70" height="40" rx="8" fill="#3B82F6" />
                <line x1="242" y1="38" x2="280" y2="38" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                <line x1="242" y1="48" x2="265" y2="48" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />

                {/* Floating UI Card 2 */}
                <rect x="210" y="90" width="130" height="50" rx="10" fill="#1E40AF" />
                <rect x="225" y="105" width="70" height="8" rx="4" fill="#93C5FD" />
                <rect x="225" y="118" width="50" height="8" rx="4" fill="#60A5FA" />
                <rect x="305" y="105" width="20" height="20" rx="4" fill="#FFFFFF" />

                {/* Table Desk */}
                <line x1="70" y1="210" x2="330" y2="210" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                <line x1="120" y1="210" x2="120" y2="290" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                <line x1="280" y1="210" x2="320" y2="290" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

                {/* Person Working */}
                <circle cx="215" cy="115" r="22" fill="#1E293B" /> {/* Hair */}
                <circle cx="215" cy="120" r="18" fill="#FCA5A5" /> {/* Face */}
                <path d="M190 145 C190 145 200 135 215 135 C230 135 240 145 240 145 L245 210 L185 210 Z" fill="#2563EB" /> {/* Torso */}
                <path d="M215 145 L245 180 L230 200" stroke="#1D4ED8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /> {/* Arm */}
                <path d="M185 200 L230 200 L230 280" stroke="#1E293B" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" /> {/* Legs */}

                {/* Laptop on desk */}
                <path d="M145 160 L185 160 L195 208 L135 208 Z" fill="#60A5FA" /> {/* Screen */}
                <circle cx="165" cy="184" r="5" fill="#FFFFFF" />
                <path d="M125 208 L205 208 L210 212 L120 212 Z" fill="#94A3B8" /> {/* Keyboard */}

                {/* Plant on left desk */}
                <path d="M85 185 L95 185 L92 210 L88 210 Z" fill="#94A3B8" />
                <ellipse cx="90" cy="178" rx="8" ry="12" fill="#10B981" />
                <ellipse cx="83" cy="182" rx="6" ry="10" fill="#059669" />
              </svg>
            </div>
          </div>

          {/* Bottom Caption */}
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Yinglima Procurement & Enterprise ERP System</p>
            <p>Secure multi-tenant inventory, supplier & consignment management</p>
          </div>
        </div>

        {/* RIGHT COLUMN: FIGMA EXACT SIGN IN FORM */}
        <div className="p-8 lg:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign In</h2>
              <p className="text-sm text-slate-500 mt-1">Welcome back! Please enter your details.</p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-600 focus:bg-white font-medium transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-10 pr-10 py-3 rounded-xl outline-none focus:border-blue-600 focus:bg-white font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Remember me</span>
                </label>

                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-blue-600 font-bold hover:underline">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button matching Figma blue button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Sign In</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
