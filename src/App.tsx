import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider, useLedgers } from './context/LedgerContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

import Transactions from './pages/Transactions';
import Config from './pages/Config';
import BatchSetEditor from './pages/BatchInput/BatchSetEditor';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-sm font-bold text-[#1D1D1F]">GULBZZUS</h2>
            <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-[0.2em]">Authenticating</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
      
      {user && (
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/settings" element={<Config />} />
          <Route path="/settings/batch/new" element={<BatchSetEditor />} />
          <Route path="/settings/batch/edit/:setId" element={<BatchSetEditor />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LedgerProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LedgerProvider>
    </AuthProvider>
  );
}
