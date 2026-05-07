import React, { useState } from 'react';
import { LogOut, User, Users, Edit2, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';

export default function Config() {
  const { logout, user } = useAuth();
  const { currentLedger, updateLedger, deleteLedger } = useLedgers();
  const navigate = useNavigate();

  const [isEditingLedger, setIsEditingLedger] = useState(false);
  const [ledgerName, setLedgerName] = useState(currentLedger?.name || '');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUpdateLedger = async () => {
    if (!currentLedger || !ledgerName) return;
    await updateLedger(currentLedger.id, { name: ledgerName });
    setIsEditingLedger(false);
  };

  const handleDeleteLedger = async () => {
    if (!currentLedger) return;
    if (confirm('이 가계부를 정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) {
      await deleteLedger(currentLedger.id);
      alert('가계부가 삭제되었습니다.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-24 px-4 pt-6">
      {/* Current Ledger Settings */}
      {currentLedger && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">가계부 관리</h2>
            {currentLedger.ownerId === user?.email && (
              <button 
                onClick={handleDeleteLedger}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors uppercase tracking-widest"
              >
                가계부 삭제
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-[#EAE7E0] shadow-sm p-6 space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block mb-3">가계부 이름</label>
              {isEditingLedger ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateLedger()}
                    className="w-full bg-[#FDFCF8] border-[#EAE7E0] focus:border-[#8B9178] focus:ring-0 rounded-xl p-4 text-sm font-bold text-[#5C544E]"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateLedger} 
                      className="flex-1 py-3.5 bg-[#8B9178] text-white rounded-xl shadow-lg shadow-[#8B9178]/20 flex items-center justify-center gap-2 font-bold text-xs active:scale-95 transition-transform"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button 
                      onClick={() => setIsEditingLedger(false)} 
                      className="px-6 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-bold text-xs active:scale-95 transition-transform"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <span 
                    onClick={() => setIsEditingLedger(true)}
                    className="text-lg font-display font-bold text-[#5C544E] cursor-pointer hover:text-[#8B9178] transition-colors"
                  >
                    {currentLedger.name}
                  </span>
                  <button onClick={() => setIsEditingLedger(true)} className="p-2 text-gray-300 hover:text-[#8B9178] transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#F9F7F2] flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-[#8B9178]/10 flex items-center justify-center text-[#8B9178]">
                  {currentLedger.type === 'shared' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                 </div>
                 <div>
                    <h4 className="text-xs font-bold text-[#5C544E]">{currentLedger.type === 'shared' ? '공유 가계부' : '개인 가계부'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Account Status</p>
                 </div>
               </div>
               {currentLedger.type === 'shared' && (
                 <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg uppercase tracking-tight">
                   Members: {currentLedger.members.length}
                 </span>
               )}
            </div>
          </div>
        </section>
      )}

      {/* Account Settings */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">계정 및 보안</h2>
        <div className="bg-white rounded-xl border border-[#EAE7E0] shadow-sm p-6">
          <div className="flex flex-col items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full">
               <div className="w-12 h-12 bg-[#F9F7F2] rounded-xl flex items-center justify-center border border-[#EAE7E0] text-gray-400">
                  <User className="w-6 h-6" />
               </div>
               <div className="min-w-0 flex-1">
                 <p className="text-sm font-bold text-[#5C544E] truncate">{user?.email}</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Google Logged In</p>
               </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full px-8 py-3.5 bg-[#5C544E] text-white rounded-xl text-xs font-bold hover:bg-[#4A443F] shadow-lg shadow-[#5C544E]/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </section>

      <div className="pt-8 text-center">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em]">Design with Purpose & Intention</p>
      </div>
    </div>
  );
}
