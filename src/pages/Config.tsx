import React, { useState } from 'react';
import { LogOut, User, Edit2, Check, X, Trash2, CreditCard, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Config() {
  const { logout, user } = useAuth();
  const { currentLedger, updateLedger, deleteLedger, ledgers, createLedger, switchLedger } = useLedgers();
  const navigate = useNavigate();

  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [ledgerToDelete, setLedgerToDelete] = useState<typeof currentLedger | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUpdateLedger = async (id: string) => {
    if (!editingName.trim()) return;
    await updateLedger(id, { name: editingName.trim() });
    setEditingLedgerId(null);
  };

  const startEditing = (ledger: any) => {
    setEditingLedgerId(ledger.id);
    setEditingName(ledger.name);
  };

  const confirmDelete = async () => {
    if (!ledgerToDelete) return;
    if (ledgers.length <= 1) {
      alert('최소 하나 이상의 가계부가 필요합니다. 마지막 가계부는 삭제할 수 없습니다.');
      setLedgerToDelete(null);
      return;
    }
    try {
      await deleteLedger(ledgerToDelete.id);
      setLedgerToDelete(null);
      if (ledgerToDelete.id === currentLedger?.id) {
        navigate('/dashboard');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateLedger = async () => {
    if (!newLedgerName) return;
    await createLedger(newLedgerName, 'personal');
    setNewLedgerName('');
    setShowCreateModal(false);
  };

  return (
    <div className="w-full space-y-10 pb-24 relative">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-[#1D1D1F]">설정</h1>
        <p className="text-[#86868B] font-medium text-sm mt-1">로그아웃 및 가계부 환경설정</p>
      </header>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {ledgerToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" 
              onClick={() => setLedgerToDelete(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#FF3B30] mb-6 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1D1D1F] text-center mb-2">가계부 삭제</h3>
              <p className="text-sm text-[#86868B] text-center mb-8 leading-relaxed font-medium">
                정말로 <span className="font-bold text-[#1D1D1F]">'{ledgerToDelete.name}'</span> 가계부를 삭제하시겠습니까? 데이터는 복구할 수 없습니다.
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete}
                  className="theme-btn-primary bg-[#FF3B30] hover:bg-[#FF453A] w-full"
                >
                  네, 삭제하겠습니다
                </button>
                <button 
                  onClick={() => setLedgerToDelete(null)}
                  className="theme-btn-secondary w-full"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">나의 프로필</h2>
        <div className="theme-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="w-14 h-14 bg-[#F5F5F7] rounded-full flex items-center justify-center text-[#86868B] border border-gray-100">
              <User className="w-8 h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-[#1D1D1F] truncate">{user?.email}</p>
              <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest mt-1">Google Logged In</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="theme-btn-primary bg-[#1D1D1F] hover:bg-black w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </section>

      {/* Ledger Management List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">전체 가계부</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-[11px] font-bold text-[#007AFF] uppercase hover:underline"
          >
            새 가계부 추가
          </button>
        </div>
        
        <div className="space-y-2">
          {ledgers.map(ledger => {
            const isCurrent = currentLedger?.id === ledger.id;
            const isEditing = editingLedgerId === ledger.id;

            return (
              <div key={ledger.id} className={`theme-card p-4 transition-all ${isCurrent ? 'border-[#007AFF]/30 bg-[#EBF5FF]/20' : 'hover:border-[#007AFF]/30'}`}>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      className="theme-input p-2 flex-1 font-bold text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateLedger(ledger.id);
                        if (e.key === 'Escape') setEditingLedgerId(null);
                      }}
                    />
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleUpdateLedger(ledger.id)}
                        className="p-2 bg-[#007AFF] text-white rounded-xl shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingLedgerId(null)}
                        className="p-2 bg-white text-[#86868B] border border-gray-100 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isCurrent ? 'bg-[#007AFF] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}>
                         <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`font-semibold text-sm ${isCurrent ? 'text-[#007AFF]' : 'text-[#1D1D1F]'}`}>{ledger.name}</span>
                        {isCurrent && <p className="text-[10px] font-bold text-[#007AFF] opacity-70">현재 가계부</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                       {isCurrent ? (
                         <button 
                            onClick={() => startEditing(ledger)}
                            className="p-2 text-[#86868B] hover:bg-[#1D1D1F]/5 rounded-xl transition-all"
                            title="이름 수정"
                         >
                            <Edit2 className="w-4 h-4" />
                         </button>
                       ) : (
                         <button 
                            onClick={() => {
                              switchLedger(ledger.id);
                              navigate('/dashboard');
                            }}
                            className="p-2 text-[#86868B] hover:bg-[#1D1D1F]/5 rounded-xl transition-all"
                            title="가계부로 이동"
                         >
                            <ExternalLink className="w-4 h-4" />
                         </button>
                       )}
                       {(ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email) && (
                          <button 
                            onClick={() => setLedgerToDelete(ledger)}
                            disabled={ledgers.length <= 1}
                            className={`p-2 transition-all rounded-xl ${ledgers.length <= 1 ? 'text-[#86868B]/30 cursor-not-allowed' : 'text-[#FF3B30] hover:bg-red-50'}`}
                            title={ledgers.length <= 1 ? "최소 한 개의 가계부가 필요합니다" : "가계부 삭제"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Create Ledger Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="w-full flex justify-center pt-4 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-gray-100 rounded-full" />
              </div>
              
              <div className="p-8 pt-6 sm:pt-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1D1D1F]">새 가계부 만들기</h3>
                </div>
                <p className="text-sm text-[#86868B] font-medium mb-8">자산을 관리할 새로운 공간의 이름을 입력하세요.</p>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">가계부 이름</label>
                    <input
                      type="text"
                      required
                      value={newLedgerName}
                      onChange={(e) => setNewLedgerName(e.target.value)}
                      placeholder="예: 2024 프로젝트 자금"
                      className="theme-input w-full font-bold"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3 pb-4">
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="theme-btn-secondary flex-1"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleCreateLedger}
                      className="theme-btn-primary flex-1 shadow-lg shadow-[#007AFF]/20"
                    >
                      가계부 생성
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-12 text-center">
        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.4em]">Designed by GULBZZUS Team</p>
      </div>
    </div>
  );
}
