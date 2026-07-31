import React from 'react';
import { useAuth } from '../auth/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Welcome, {user?.name || 'Yinglima Admin'}
      </h2>
    </div>
  );
};
