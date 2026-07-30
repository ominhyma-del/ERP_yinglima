import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'USER' | 'PROCUREMENT_ADMIN';
  company: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rolePreference?: 'ADMIN' | 'USER') => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('yinglima_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default Admin User logged in
    return {
      id: 'usr-admin-1',
      email: 'admin@yinglima.com',
      full_name: 'Yinglima Admin',
      role: 'ADMIN',
      company: 'Yinglima Machinery & Trade (China HQ / India)',
    };
  });

  const login = (email: string, password: string, rolePreference?: 'ADMIN' | 'USER'): boolean => {
    if (!email || !password) return false;

    const isAdmin = email.toLowerCase().includes('admin') || rolePreference === 'ADMIN';

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: email,
      full_name: isAdmin ? 'Yinglima System Admin' : 'Yinglima User',
      role: isAdmin ? 'ADMIN' : 'USER',
      company: 'Yinglima Machinery & Trade (China HQ / India)',
    };

    setUser(newUser);
    localStorage.setItem('yinglima_auth_user', JSON.stringify(newUser));

    // Append Audit Log entry
    const auditLogs = JSON.parse(localStorage.getItem('yinglima_audit_logs') || '[]');
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_email: email,
      action: 'LOGIN_SUCCESS',
      entity: 'USER_AUTH',
      entity_id: newUser.id,
      role: newUser.role,
      ip_address: '127.0.0.1 (Local Session)',
      status: 'SUCCESS',
      description: `User "${email}" authenticated successfully as ${newUser.role}`,
    };
    localStorage.setItem('yinglima_audit_logs', JSON.stringify([newLog, ...auditLogs]));

    return true;
  };

  const logout = () => {
    if (user) {
      const auditLogs = JSON.parse(localStorage.getItem('yinglima_audit_logs') || '[]');
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_email: user.email,
        action: 'LOGOUT',
        entity: 'USER_AUTH',
        entity_id: user.id,
        role: user.role,
        ip_address: '127.0.0.1 (Local Session)',
        status: 'SUCCESS',
        description: `User "${user.email}" logged out`,
      };
      localStorage.setItem('yinglima_audit_logs', JSON.stringify([newLog, ...auditLogs]));
    }

    setUser(null);
    localStorage.removeItem('yinglima_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
