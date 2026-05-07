import React, { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Wallet, label: '가계부', path: '/transactions' },
    { icon: Settings, label: '설정', path: '/settings' },
  ];

  const currentTitle = useMemo(() => {
    if (location.pathname === '/transactions') return '가계부';
    if (location.pathname === '/settings') return '설정';
    if (location.pathname === '/dashboard') return '대시보드';
    return '';
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#F9F7F2] overflow-hidden relative">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F9F7F2] relative">
        <header className="h-16 lg:h-20 flex items-center px-6 lg:px-12 z-10 bg-white/50 backdrop-blur-md border-b border-[#EAE7E0]/50 sticky top-0">
          <div className="flex-1 flex items-center">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-3 group transition-transform active:scale-95"
            >
              <div className="w-10 h-10 bg-[#6B705C] rounded-xl flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-all">
                <CreditCard className="w-6 h-6" />
              </div>
              <h1 className="hidden">MoMoney</h1>
            </button>
            
            <div className="hidden sm:block ml-4 px-4 py-2 bg-[#EAE7E0]/50 rounded-xl text-[#5C544E] text-[10px] font-bold tracking-widest uppercase">
              Personal Wallet
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <h2 className="text-base font-display font-bold text-[#5C544E] tracking-tight">{currentTitle}</h2>
          </div>

          <div className="flex-1" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 pb-24 lg:pb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-2xl border-t border-[#D9D4C7] flex items-center justify-around px-4 z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] lg:px-[30%]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 p-2 transition-all rounded-xl min-w-[72px]",
                isActive ? "text-[#6B705C]" : "text-gray-400 hover:text-[#5C544E]"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
