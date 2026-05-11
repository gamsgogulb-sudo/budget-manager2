import React, { useState } from 'react';
import { LogOut, User, Users, Edit2, Check, X, Trash2, CreditCard, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Config() {
  const { logout, user } = useAuth();
  const { currentLedger, updateLedger, deleteLedger, ledgers, createLedger } = useLedgers();
  const navigate = useNavigate();

  const [isEditingLedger, setIsEditingLedger] = useState(false);
  const [ledgerName, setLedgerName] = useState(currentLedger?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUpdateLedger = async () => {
    if (!currentLedger || !ledgerName) return;
    await updateLedger(currentLedger.id, { name: ledgerName });
    setIsEditingLedger(false);
  };

  const confirmDelete = async () => {
    if (!currentLedger) return;
    try {
      await deleteLedger(currentLedger.id);
      setShowDeleteConfirm(false);
      navigate('/dashboard');
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
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" 
              onClick={() => setShowDeleteConfirm(false)} 
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
                정말로 <span className="font-bold text-[#1D1D1F]">'{currentLedger?.name}'</span> 가계부를 삭제하시겠습니까? 데이터는 복구할 수 없습니다.
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDelete}
                  className="theme-btn-primary bg-[#FF3B30] hover:bg-[#FF453A] w-full"
                >
                  네, 삭제하겠습니다
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
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

      {/* Current Ledger Settings */}
      {currentLedger && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">가계부 이름 수정</h2>
          </div>
          
          <div className="theme-card p-6">
            <div>
              {isEditingLedger ? (
                <div className="flex flex-col gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateLedger()}
                    className="theme-input w-full font-bold text-[#1D1D1F]"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateLedger} 
                      className="theme-btn-primary flex-1 bg-[#007AFF]"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button 
                      onClick={() => setIsEditingLedger(false)} 
                      className="theme-btn-secondary flex-1"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F5F7] rounded-xl flex items-center justify-center text-[#007AFF]">
                       <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 
                        onClick={() => setIsEditingLedger(true)}
                        className="text-lg font-bold text-[#1D1D1F] cursor-pointer hover:text-[#007AFF] transition-colors"
                      >
                        {currentLedger.name}
                      </h4>
                      <p className="text-[9px] font-bold text-[#86868B] uppercase tracking-widest mt-0.5">Active Ledger</p>
                    </div>
                  </div>
                  <button onClick={() => setIsEditingLedger(true)} className="p-2 text-gray-300 hover:text-[#007AFF] transition-all">
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
          {ledgers.map(ledger => (
            <div key={ledger.id} className="theme-card p-4 flex items-center justify-between group hover:border-[#007AFF]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F5F5F7] rounded-xl flex items-center justify-center text-[#86868B]">
                   <CreditCard className="w-5 h-5" />
                </div>
                <span className="font-semibold text-[#1D1D1F] text-sm">{ledger.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 {ledger.ownerId === user?.uid && ledgers.length > 1 && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 text-[#FF3B30] hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      {currentLedger && currentLedger.ownerId === user?.uid && ledgers.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-[0.15em] px-1">DANGER ZONE</h2>
          <div className="bg-[#FF3B30]/5 rounded-[2rem] border border-[#FF3B30]/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">가계부 삭제</h3>
              <p className="text-xs text-[#86868B] font-medium mt-1">삭제된 가계부는 복구할 수 없습니다. 모든 거래 내역이 삭제됩니다.</p>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto theme-btn-primary bg-[#FF3B30] hover:bg-[#FF453A]"
            >
              <Trash2 className="w-4 h-4" />
              가계부 삭제하기
            </button>
          </div>
        </section>
      )}

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
        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.4em]">Designed by MoMoney Team</p>
      </div>
    </div>
  );
}
