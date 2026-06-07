import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Plus, Users, User, Check, Share2, Mail, X, Settings, Trash2, Edit2 } from 'lucide-react';
import { useLedgers } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function LedgerSwitcher() {
  const { ledgers, currentLedger, switchLedger, createLedger, updateLedger, deleteLedger } = useLedgers();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState<{ id: string, name: string, type: 'personal' | 'shared' } | null>(null);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerType, setNewLedgerType] = useState<'personal' | 'shared'>('shared');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'personal' | 'shared'>('shared');

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName) return;
    await createLedger(newLedgerName, newLedgerType);
    setNewLedgerName('');
    setShowCreateModal(false);
  };

  const handleUpdateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedger || !editName) return;
    await updateLedger(editingLedger.id, { name: editName, type: editType });
    setShowEditModal(false);
    setEditingLedger(null);
  };

  const handleDeleteLedger = async (ledgerId: string) => {
    if (!window.confirm('정말 이 가계부를 삭제하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다.')) return;
    await deleteLedger(ledgerId);
    setShowEditModal(false);
    setEditingLedger(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 py-1 px-1 transition-all active:scale-95 group bg-transparent min-w-[100px]"
      >
        <span className="text-base font-bold text-[#1D1D1F] tracking-tight truncate max-w-[150px]">
          {currentLedger?.name || '가계부 선택'}
        </span>
        <ChevronDown className="w-4 h-4 text-[#86868B] group-hover:text-[#1D1D1F] transition-all" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[1.25rem] shadow-none overflow-hidden border border-gray-100"
            >
              <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>
              
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1D1D1F]">가계부 선택</h3>
                  <p className="text-xs font-medium text-[#86868B] mt-1">이동할 가계부를 선택하거나 추가하세요.</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#86868B]" />
                </button>
              </div>
              
              <div className="max-h-[50vh] min-h-[160px] overflow-y-auto p-6 space-y-3">
                {ledgers.map((ledger) => (
                  <button
                    key={ledger.id}
                    onClick={() => {
                      switchLedger(ledger.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between h-14 px-5 rounded-[11px] transition-all text-left border-2",
                      currentLedger?.id === ledger.id 
                        ? "bg-[#0066cc]/10 border-[#0066cc]/20" 
                        : "bg-[#F5F5F7] border-transparent hover:bg-[#EEEEF0]"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-[11px] flex items-center justify-center transition-all",
                        currentLedger?.id === ledger.id ? "bg-[#0066cc] text-white" : "bg-[#F5F5F7] text-[#86868B]"
                      )}>
                        {ledger.type === 'shared' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-bold truncate", currentLedger?.id === ledger.id ? "text-[#0066cc]" : "text-[#1D1D1F]")}>
                          {ledger.name}
                        </p>
                        {ledger.type === 'shared' && ledger.ownerEmail && (
                          <p className="text-[10px] text-[#86868B] font-medium truncate mt-0.5">
                            Owner: {ledger.ownerEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    {currentLedger?.id === ledger.id && (
                      <Check className="w-5 h-5 text-[#0066cc] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-8 border-t border-gray-50 bg-[#FBFBFB]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setTimeout(() => setShowCreateModal(true), 300);
                  }}
                  className="theme-btn-primary w-full"
                >
                  <Plus className="w-5 h-5" />
                  <span>새 가계부 추가하기</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Ledger Modal */}
      <AnimatePresence>
        {showEditModal && editingLedger && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setEditingLedger(null);
              }}
              className="absolute inset-0 bg-[#1D1D1F]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[18px] shadow-none border border-gray-100 overflow-hidden p-8"
            >
              <div className="flex flex-col items-center mb-8">
                 <div className="w-12 h-12 bg-[#0066cc]/10 text-[#0066cc] rounded-[11px] flex items-center justify-center mb-4">
                    <Edit2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-[#1D1D1F]">가계부 수정</h3>
                 <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mt-1">Manage your ledger settings</p>
              </div>

              <form onSubmit={handleUpdateLedger} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">이름</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="가계부 이름"
                    className="theme-input w-full font-bold"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">모드 설정</label>
                  </div>
                  
                  <div className="flex bg-[#F5F5F7] p-1 rounded-[11px] border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditType('personal')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-[11px] text-xs font-bold transition-all",
                        editType === 'personal' ? "bg-white text-[#1D1D1F] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
                      )}
                    >
                      <User className="w-4 h-4" />
                      개인용
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('shared')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-[11px] text-xs font-bold transition-all",
                        editType === 'shared' ? "bg-white text-[#0066cc] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
                      )}
                    >
                      <Users className="w-4 h-4" />
                      공유용
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    className="theme-btn-primary w-full shadow-none"
                  >
                    수정 완료
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 theme-btn-secondary"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLedger(editingLedger.id)}
                      className="flex-1 py-3 rounded-xl font-bold text-[#FF3B30] hover:bg-red-50 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      가계부 삭제
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-[#1D1D1F]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[18px] shadow-none border border-gray-100 overflow-hidden p-8"
            >
              <div className="flex flex-col items-center mb-8">
                 <div className="w-12 h-12 bg-[#0066cc]/10 text-[#0066cc] rounded-[11px] flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-[#1D1D1F]">새 가계부</h3>
                 <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mt-1">Start a new finance session</p>
              </div>

              <form onSubmit={handleCreateLedger} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">이름</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    placeholder="예: 2024 생활비"
                    className="theme-input w-full font-bold"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">모드 설정</label>
                  </div>
                  
                  <div className="flex bg-[#F5F5F7] p-1 rounded-[11px] border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setNewLedgerType('personal')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-[11px] text-xs font-bold transition-all",
                        newLedgerType === 'personal' ? "bg-white text-[#1D1D1F] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
                      )}
                    >
                      <User className="w-4 h-4" />
                      개인용
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLedgerType('shared')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-[11px] text-xs font-bold transition-all",
                        newLedgerType === 'shared' ? "bg-white text-[#0066cc] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
                      )}
                    >
                      <Users className="w-4 h-4" />
                      공유용
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    className="theme-btn-primary w-full shadow-none"
                  >
                    가계부 만들기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="theme-btn-secondary w-full"
                  >
                    돌아가기
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
