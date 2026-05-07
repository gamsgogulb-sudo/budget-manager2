import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Wallet, 
  Settings, 
  Share2,
  Mail,
  X,
  Plus,
  User,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import LedgerSwitcher from './LedgerSwitcher';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user } = useAuth();
  const { currentLedger, inviteMember } = useLedgers();
  const navigate = useNavigate();
  const location = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const navItems = [
    { icon: LayoutDashboard, label: '대시보드', path: '/dashboard' },
    { icon: Wallet, label: '내역', path: '/transactions' },
    { icon: Settings, label: '설정', path: '/settings' },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentLedger) return;
    await inviteMember(currentLedger.id, inviteEmail);
    setInviteEmail('');
    setShowShareModal(false);
    alert(`${inviteEmail}님에게 공유 설정이 완료되었습니다.`);
  };

  return (
    <div className="flex h-screen bg-[#F9F7F2] overflow-hidden relative">
      <main className="flex-1 flex flex-col min-w-0 bg-[#F9F7F2] relative">
        <header className="z-[35] bg-[#F9F7F2]">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-7 h-7 bg-[#8B9178] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#8B9178]/10 transition-transform active:scale-95 cursor-pointer" 
                onClick={() => navigate('/dashboard')}
              >
                <CreditCard className="w-4 h-4" />
              </div>
              <LedgerSwitcher />
            </div>

            <div className="flex items-center gap-2">
              {currentLedger && location.pathname === '/transactions' && (
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="p-2 text-gray-400 hover:text-[#8B9178] transition-colors border-none bg-transparent active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-24 lg:pb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-6 max-w-4xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>

        <AnimatePresence>
          {showShareModal && currentLedger && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#EAE7E0]"
              >
                <div className="p-6 border-b border-[#F9F7F2] flex items-center justify-between bg-[#FDFCF8]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-[#5C544E]">가계부 공유</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{currentLedger.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8">
                  <form onSubmit={handleInvite} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">공유할 사용자 이메일</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full bg-[#FDFCF8] border border-[#EAE7E0] focus:border-[#8B9178] focus:ring-0 rounded-2xl p-4 pl-12 text-sm font-bold text-[#5C544E]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-[#8B9178] text-white rounded-2xl font-bold shadow-lg shadow-[#8B9178]/20 hover:bg-[#6B705C] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      공유하기
                    </button>
                  </form>

                  {currentLedger.memberEmails && currentLedger.memberEmails.length > 1 && (
                    <div className="mt-8 pt-8 border-t border-[#F9F7F2]">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">공유된 멤버</h4>
                      <div className="space-y-2">
                        {currentLedger.memberEmails.map((memberEmail: string) => (
                          <div key={memberEmail} className="flex items-center gap-3 p-3 bg-[#FDFCF8] rounded-xl border border-[#EAE7E0]">
                            <div className="w-8 h-8 rounded-full bg-[#8B9178]/10 text-[#8B9178] flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-[#5C544E]">{memberEmail}</span>
                            {memberEmail === currentLedger.ownerEmail && (
                              <span className="ml-auto text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase">Owner</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-[#D9D4C7] z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto h-16 flex items-center justify-around px-4">
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
          </div>
        </nav>
      </main>
    </div>
  );
}
