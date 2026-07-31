import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SupplierListPage } from './features/supplier/SupplierListPage';
import { BuyerListPage } from './features/buyer/BuyerListPage';
import { ProductMasterPage } from './features/product-master/ProductMasterPage';
import { InquiryPlanningPage } from './features/inquiry/InquiryPlanningPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { TeamMembersPage } from './features/team/TeamMembersPage';
import { RolesPermissionsPage } from './features/team/RolesPermissionsPage';
import { AuditLogsPage } from './features/team/AuditLogsPage';
import { can } from './features/team/teamStore';
import { ROUTE_PERMISSION } from './config/routeAccess';
import { GhostPageLoader } from './components/common/SkeletonLoader';
import { OfflineBanner } from './components/common/OfflineBanner';

/**
 * Guards a route against direct URL access.
 */
function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const gate = ROUTE_PERMISSION[path];
  const allowed = gate === null || gate === undefined ? true : can(user as any, gate, 'view');
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function MainContent() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isNavigating) {
    return <GhostPageLoader />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* DASHBOARD */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* PURCHASE */}
      <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><SupplierListPage /></ProtectedRoute>} />
      <Route path="/localpurchase" element={<ProtectedRoute path="/localpurchase"><InquiryPlanningPage /></ProtectedRoute>} />

      {/* SALES & BUYERS */}
      <Route path="/buyers" element={<ProtectedRoute path="/buyers"><BuyerListPage /></ProtectedRoute>} />

      {/* PRODUCTS & STOCK */}
      <Route path="/products" element={<ProtectedRoute path="/products"><ProductMasterPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<AnalyticsPage />} />

      {/* TEAM & ACCESS */}
      <Route path="/team" element={<ProtectedRoute path="/team"><TeamMembersPage /></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute path="/roles"><RolesPermissionsPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute path="/audit-logs"><AuditLogsPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [currentCompany, setCompany] = useState<string>('c1');

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-r-indigo-500 border-t-transparent border-b-transparent border-l-transparent animate-spin [animation-duration:1.5s] [animation-direction:reverse]"></div>
          <div className="absolute inset-4 rounded-full border-4 border-b-purple-500 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:1s]"></div>
        </div>
        <h2 className="text-lg font-bold tracking-widest text-slate-200">YINGLIMA</h2>
        <p className="text-xs text-slate-500 mt-1">Initializing secure ERP environment...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentCompany={currentCompany} setCompany={setCompany} />

        <main className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          <MainContent />
        </main>
      </div>
      <OfflineBanner />
    </div>
  );
}

export default App;
