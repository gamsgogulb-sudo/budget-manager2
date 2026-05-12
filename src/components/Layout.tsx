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
  CreditCard,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import LedgerSwitcher from './LedgerSwitcher';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user } = useAuth();
  const { currentLedger, inviteMember, removeMember, updateLedger } = useLedgers();
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

  const handleRemoveMember = async (email: string) => {
    if (!currentLedger) return;
    if (window.confirm(`${email}님을 가계부에서 제외하시겠습니까?`)) {
      try {
        await removeMember(currentLedger.id, email);
      } catch (error) {
        alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden relative">
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="relative z-[50]">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 bg-[#007AFF] rounded-xl flex items-center justify-center text-white shadow-xl shadow-[#007AFF]/20 transition-transform active:scale-95 cursor-pointer" 
                onClick={() => navigate('/dashboard')}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <LedgerSwitcher />
            </div>

            <div className="flex items-center gap-2">
              {currentLedger && location.pathname === '/transactions' && (currentLedger.ownerId === user?.uid || currentLedger.canMemberShare) && (
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="p-2 text-gray-400 hover:text-[#007AFF] transition-colors border-none bg-transparent active:scale-95"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-28 lg:pb-20">
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
            <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)}
                className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="p-6 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-[#1D1D1F]">가계부 공유</h3>
                      <p className="text-xs text-[#86868B] font-medium">{currentLedger.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 pt-4 space-y-8">
                  <form onSubmit={handleInvite} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] ml-1">공유할 사용자 이메일</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="apple@example.com"
                          className="theme-input w-full pl-12"
                        />
                      </div>
                    </div>

                    {currentLedger.ownerId === user?.uid && (
                      <div className="flex items-center justify-between px-1 py-1">
                        <div>
                          <p className="text-xs font-semibold text-[#1D1D1F]">멤버의 권한 설정</p>
                          <p className="text-[10px] text-[#86868B] font-medium">멤버가 다른 사용자를 초대하는 것을 허용합니다.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateLedger(currentLedger.id, { canMemberShare: !currentLedger.canMemberShare })}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                            currentLedger.canMemberShare ? "bg-[#34C759]" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                              currentLedger.canMemberShare ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="theme-btn-primary w-full shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="w-5 h-5" />
                      공유하기
                    </button>
                  </form>

                  {currentLedger.memberEmails && currentLedger.memberEmails.length > 1 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-[#86868B] ml-1 uppercase tracking-wider">공유된 멤버</h4>
                      <div className="space-y-2">
                        {[...currentLedger.memberEmails].sort((a, b) => {
                          if (a === currentLedger.ownerEmail) return -1;
                          if (b === currentLedger.ownerEmail) return 1;
                          return 0;
                        }).map((memberEmail: string) => (
                          <div key={memberEmail} className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-2xl border border-transparent">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-[#1D1D1F]">{memberEmail}</span>
                            {memberEmail === currentLedger.ownerEmail ? (
                              <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Owner</span>
                            ) : (
                              currentLedger.ownerId === user?.uid && (
                                <button
                                  onClick={() => handleRemoveMember(memberEmail)}
                                  className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-6" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Navigation Bar */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[40]">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/40 ring-1 ring-black/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2.5rem] px-4 py-2">
            <div className="flex items-center justify-around h-14">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "relative flex flex-col items-center gap-1 p-2 transition-all rounded-2xl min-w-[64px]",
                    isActive ? "text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div 
                          layoutId="nav-glow"
                          className="absolute inset-0 bg-blue-50/50 rounded-2xl -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <item.icon className={cn("w-5 h-5 transition-transform", "active:scale-90")} />
                      <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </main>
    </div>
  );
}
