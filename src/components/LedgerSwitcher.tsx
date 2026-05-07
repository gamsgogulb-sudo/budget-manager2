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
        className="flex items-center gap-1.5 py-1 transition-all active:scale-95 group bg-transparent"
      >
        <span className="text-base font-display font-black text-[#5C544E] tracking-tight">{currentLedger?.name || '가계부'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#5C544E] transition-all" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#EAE7E0]"
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />
              
              <div className="p-6 pt-8 sm:pt-6 border-b border-[#F9F7F2] flex items-center justify-between bg-[#FDFCF8]">
                <div>
                   <h3 className="font-display font-bold text-[#5C544E]">가계부 전환</h3>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Switch or add new ledger</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="max-h-[50vh] min-h-[200px] overflow-y-auto p-4 space-y-2 pb-8">
                {ledgers.map((ledger) => (
                  <button
                    key={ledger.id}
                    onClick={() => {
                      switchLedger(ledger.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left group",
                      currentLedger?.id === ledger.id 
                        ? "bg-[#8B9178]/10 text-[#6B705C] border-2 border-[#8B9178]/20" 
                        : "bg-[#FDFCF8] border border-[#EAE7E0] text-[#5C544E] hover:border-[#8B9178]/30 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        currentLedger?.id === ledger.id ? "bg-[#8B9178] text-white" : "bg-white border border-[#EAE7E0] text-gray-400 group-hover:bg-[#8B9178]/10 group-hover:text-[#8B9178]"
                      )}>
                        {ledger.type === 'shared' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{ledger.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {ledger.type === 'shared' ? `Shared Wallet` : 'Personal Only'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {ledger.ownerId === user?.email && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLedger({ id: ledger.id, name: ledger.name, type: ledger.type });
                            setEditName(ledger.name);
                            setEditType(ledger.type);
                            setIsOpen(false);
                            setTimeout(() => setShowEditModal(true), 300);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#8B9178] transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {currentLedger?.id === ledger.id && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="w-5 h-5 text-[#8B9178]" />
                        </motion.div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-[#FDFCF8] border-t border-[#F9F7F2] pb-10 sm:pb-6">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setTimeout(() => setShowCreateModal(true), 300);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[#5C544E] text-white rounded-2xl font-bold hover:bg-[#4A443F] shadow-lg shadow-[#5C544E]/20 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span>새 가계부 추가</span>
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex flex-col items-center mb-8">
                 <div className="w-12 h-12 bg-[#8B9178]/10 text-[#8B9178] rounded-2xl flex items-center justify-center mb-4">
                    <Edit2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-display font-bold text-[#5C544E]">가계부 수정</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your ledger settings</p>
              </div>

              <form onSubmit={handleUpdateLedger} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest ml-1">이름</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="가계부 이름"
                    className="w-full bg-[#FDFCF8] border border-[#EAE7E0] focus:border-[#8B9178] focus:ring-0 rounded-2xl p-4 text-sm font-bold text-[#5C544E] text-center"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">모드 설정</label>
                    <span className={cn(
                      "text-[10px] font-bold uppercase py-1 px-2 rounded-lg transition-all",
                      editType === 'shared' ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"
                    )}>
                      {editType === 'shared' ? 'Shared' : 'Personal'}
                    </span>
                  </div>
                  
                  <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
                    <button
                      type="button"
                      onClick={() => setEditType('personal')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        editType === 'personal' ? "bg-white text-[#5C544E] shadow-sm" : "text-gray-400 hover:text-gray-500"
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      개인용
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('shared')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        editType === 'shared' ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-500"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      공유용
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#8B9178] text-white rounded-2xl font-bold shadow-lg shadow-[#8B9178]/30 hover:bg-[#6B705C] transition-all active:scale-95"
                  >
                    수정 완료
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-300 hover:text-gray-500 transition-all text-[11px] uppercase tracking-widest"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLedger(editingLedger.id)}
                      className="flex-1 py-3 rounded-xl font-bold text-red-300 hover:text-red-500 hover:bg-red-50 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex flex-col items-center mb-8">
                 <div className="w-12 h-12 bg-[#8B9178]/10 text-[#8B9178] rounded-2xl flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-display font-bold text-[#5C544E]">새 가계부</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Start a new finance session</p>
              </div>

              <form onSubmit={handleCreateLedger} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest ml-1">이름</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    placeholder="예: 2024 생활비"
                    className="w-full bg-[#FDFCF8] border border-[#EAE7E0] focus:border-[#8B9178] focus:ring-0 rounded-2xl p-4 text-sm font-bold text-[#5C544E] text-center"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">모드 설정</label>
                    <span className={cn(
                      "text-[10px] font-bold uppercase py-1 px-2 rounded-lg transition-all",
                      newLedgerType === 'shared' ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"
                    )}>
                      {newLedgerType === 'shared' ? 'Shared' : 'Personal'}
                    </span>
                  </div>
                  
                  <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
                    <button
                      type="button"
                      onClick={() => setNewLedgerType('personal')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        newLedgerType === 'personal' ? "bg-white text-[#5C544E] shadow-sm" : "text-gray-400 hover:text-gray-500"
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      개인용
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLedgerType('shared')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                        newLedgerType === 'shared' ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-500"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      공유용
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#8B9178] text-white rounded-2xl font-bold shadow-lg shadow-[#8B9178]/30 hover:bg-[#6B705C] transition-all active:scale-95"
                  >
                    가계부 만들기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-3 rounded-xl font-bold text-gray-300 hover:text-gray-500 transition-all text-[11px] uppercase tracking-widest"
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
