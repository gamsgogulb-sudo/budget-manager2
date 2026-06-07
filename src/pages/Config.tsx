import React, { useState, useEffect } from 'react';
import { LogOut, User, Edit2, Check, X, Trash2, CreditCard, Plus, ArrowUpRight, Play, Zap, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getLocalDateString } from '../lib/utils';
import { subscribeBatchEntrySets, addTransaction, deleteBatchEntrySet } from '../services/transactionService';
import { BatchEntrySet, Transaction } from '../types';

export default function Config() {
  const { logout, user } = useAuth();
  const { currentLedger, updateLedger, deleteLedger, ledgers, createLedger, switchLedger } = useLedgers();
  const navigate = useNavigate();

  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [ledgerToDelete, setLedgerToDelete] = useState<typeof currentLedger | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');

  // Batch Input (Singleton Template) logic
  const [templates, setTemplates] = useState<BatchEntrySet[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [openTemplateActionsId, setOpenTemplateActionsId] = useState<string | null>(null);
  const [openLedgerActionsId, setOpenLedgerActionsId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<BatchEntrySet | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentLedger || !user) return;
    const unsubscribe = subscribeBatchEntrySets(currentLedger.id, (data) => {
      setTemplates(data);
    });
    return () => unsubscribe();
  }, [currentLedger, user]);

  const handleApplyTemplate = async (template: BatchEntrySet) => {
    if (!currentLedger || !user || applying) return;

    setApplying(template.id);
    try {
      const today = getLocalDateString(new Date());
      const now = new Date().toISOString();
      const promises = template.items.map(item => 
        addTransaction(currentLedger.id, user.uid, {
          type: item.type || 'expense',
          category: item.category || '기타',
          subCategory: item.subCategory || '',
          amount: item.amount || 0,
          paymentMethod: item.paymentMethod || '',
          memo: item.memo || '',
          date: today,
          createdAt: now,
          settlementStatus: '완료',
          marker: false,
          newSubCategory: '',
          photoUrls: [],
          settledFromAccount: item.settledFromAccount || '',
          settledToAccount: item.settledToAccount || '',
        } as Omit<Transaction, 'id' | 'ownerId'>)
      );
      await Promise.all(promises);
      navigate('/transactions');
    } catch (error) {
      console.error('[Config] Apply failed:', error);
    } finally {
      setApplying(null);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete || !currentLedger) return;
    try {
      await deleteBatchEntrySet(currentLedger.id, templateToDelete.id);
      setToast({ message: '템플릿이 성공적으로 삭제되었습니다.', type: 'success' });
      setTemplateToDelete(null);
      setOpenTemplateActionsId(null);
    } catch (error) {
      console.error('[Config] Delete template failed:', error);
      setToast({ message: '삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleCardClick = () => {
    if (templates.length > 0) {
      handleApplyTemplate(templates[0]);
    } else {
      setToast({ message: '등록된 템플릿이 없습니다.', type: 'error' });
    }
  };

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

      {/* Profile Section */}
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
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 rounded-xl font-bold text-xs active:scale-95 transition-all text-center w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </section>

      {/* Ledger Management List Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">전체 가계부</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-[11px] font-bold text-[#0066cc] uppercase hover:underline"
          >
            새 가계부 추가
          </button>
        </div>
        
        {/* Invisible full-screen backdrop to dismiss ledger actions on tap outside */}
        {openLedgerActionsId && (
          <div 
            className="fixed inset-0 z-30 bg-transparent" 
            onClick={() => setOpenLedgerActionsId(null)}
          />
        )}

        <div className="space-y-2">
          {ledgers.map(ledger => {
            const isCurrent = currentLedger?.id === ledger.id;
            const isEditing = editingLedgerId === ledger.id;

            return (
              <div 
                key={ledger.id} 
                className={cn(
                  "relative overflow-hidden theme-card px-5 h-[76px] flex items-center justify-between transition-all select-none cursor-pointer z-40",
                  isCurrent ? 'border-[#0066cc]/20 bg-[#0066cc]/5' : 'hover:border-[#0066cc]/20'
                )}
                onClick={() => {
                  if (isEditing) return;
                  if (openLedgerActionsId === ledger.id) {
                    setOpenLedgerActionsId(null);
                    return;
                  }
                  if (openLedgerActionsId) {
                    setOpenLedgerActionsId(null);
                    return;
                  }
                  switchLedger(ledger.id);
                  navigate('/dashboard');
                }}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full h-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      className="px-3 h-10 bg-[#F5F5F7] border border-transparent focus:bg-white focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] rounded-[11px] text-sm font-bold transition-all flex-1"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateLedger(ledger.id);
                        if (e.key === 'Escape') setEditingLedgerId(null);
                      }}
                    />
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => handleUpdateLedger(ledger.id)}
                        className="p-2 bg-[#0066cc] text-white rounded-[11px] shadow-none"
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
                  <div className="flex items-center justify-between w-full h-full">
                    <div className="flex items-center gap-3 min-w-0 pointer-events-none select-none">
                      <div className={cn(
                        "w-10 h-10 rounded-[11px] flex items-center justify-center transition-colors shrink-0",
                        isCurrent ? 'bg-[#0066cc] text-white' : 'bg-[#F5F5F7] text-[#86868B]'
                      )}>
                         <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={cn("font-bold text-sm truncate leading-snug", isCurrent ? 'text-[#0066cc]' : 'text-[#1D1D1F]')}>
                            {ledger.name}
                          </p>
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none shrink-0",
                            (ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email)
                              ? "bg-gray-100 text-[#86868B]" 
                              : "bg-amber-100 text-[#FF9500]"
                          )}>
                            {(ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email) ? "내 소유" : "공유받음"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap min-w-0">
                          {isCurrent && <span className="text-[10px] font-bold text-[#0066cc] opacity-75 leading-none shrink-0">현재 가계부</span>}
                          {!(ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email) && ledger.ownerEmail && (
                            <span className="text-[9px] font-semibold text-[#86868B] leading-none truncate">
                              소유자: {ledger.ownerEmail.split('@')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id={`ledger-more-btn-${ledger.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenLedgerActionsId(openLedgerActionsId === ledger.id ? null : ledger.id);
                        }}
                        className="p-2 text-[#86868B] hover:bg-[#1D1D1F]/5 rounded-xl transition-all"
                        title="더보기"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Swipe Actions Sliding Overlay */}
                    <AnimatePresence>
                      {openLedgerActionsId === ledger.id && (
                        <motion.div
                          initial={{ x: '100%' }}
                          animate={{ x: '0%' }}
                          exit={{ x: '100%' }}
                          transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card selection click when tapping on actions container
                          }}
                          className="absolute inset-y-0 right-0 z-50 bg-[#F5F5F7]/95 backdrop-blur-md border-l border-gray-100/50 flex items-center px-3 gap-2 h-full rounded-r-[18px]"
                          style={{ width: '112px' }}
                        >
                          <button
                            id={`ledger-edit-btn-${ledger.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(ledger);
                              setOpenLedgerActionsId(null);
                            }}
                            className="flex items-center justify-center w-10 h-10 bg-[#0066cc] text-white active:opacity-85 rounded-[11px] transition-all font-semibold shrink-0 shadow-none"
                            title="이름 수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`ledger-delete-btn-${ledger.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOwner = ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email;
                              if (!isOwner) {
                                setToast({ message: '가계부 소유자만 삭제할 수 있습니다.', type: 'error' });
                              } else if (ledgers.length <= 1) {
                                setToast({ message: '최소 한 개의 가계부가 필요합니다.', type: 'error' });
                              } else {
                                setLedgerToDelete(ledger);
                              }
                              setOpenLedgerActionsId(null);
                            }}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 text-white rounded-xl transition-all font-semibold shrink-0 shadow-sm",
                              (ledgers.length <= 1 || !(ledger.ownerId === user?.uid || ledger.ownerEmail === user?.email))
                                ? "bg-[#FF3B30]/30 cursor-not-allowed opacity-50" 
                                : "bg-[#FF3B30] hover:bg-[#E02B20] active:opacity-85"
                            )}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Input Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">한번에 입력하기</h2>
          <button 
            onClick={() => {
              if (templates.length >= 3) {
                setToast({ message: '템플릿은 최대 3개까지 생성할 수 있습니다.', type: 'error' });
              } else {
                navigate('/settings/batch/new');
              }
            }}
            className="text-[11px] font-bold text-[#0066cc] uppercase hover:underline"
          >
            새 템플릿 추가
          </button>
        </div>
        
        {/* Invisible full-screen backdrop to dismiss actions on tap outside */}
        {openTemplateActionsId && (
          <div 
            className="fixed inset-0 z-30 bg-transparent" 
            onClick={() => setOpenTemplateActionsId(null)}
          />
        )}

        <div className="space-y-2">
          {templates.length === 0 ? (
            <div 
              onClick={() => navigate('/settings/batch/new')}
              className="relative overflow-hidden h-[76px] theme-card px-5 flex items-center justify-between cursor-pointer hover:border-[#0066cc]/20 transition-all bg-white w-full select-none"
            >
              <div className="flex items-center gap-3 min-w-0 pointer-events-none select-none">
                <div className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-colors shrink-0 bg-[#F5F5F7] text-[#86868B]">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1D1D1F] truncate leading-snug">
                    등록된 템플릿이 없습니다
                  </p>
                  <p className="text-[10px] text-[#86868B] font-bold mt-0.5 leading-none">
                    자주 쓰는 가계부 내역을 템플릿으로 등록하세요
                  </p>
                </div>
              </div>
            </div>
          ) : (
            templates.slice(0, 3).map((template) => (
              <div 
                key={template.id}
                onClick={(e) => {
                  if (openTemplateActionsId === template.id) {
                    setOpenTemplateActionsId(null);
                    return;
                  }
                  if (openTemplateActionsId) {
                    setOpenTemplateActionsId(null);
                    return;
                  }
                  handleApplyTemplate(template);
                }}
                className="relative overflow-hidden h-[76px] theme-card px-5 flex items-center justify-between cursor-pointer hover:border-[#0066cc]/20 transition-all group bg-white w-full select-none z-40"
              >
                {/* Static Card Content */}
                <div className="flex items-center gap-3 min-w-0 pointer-events-none select-none">
                  <div className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-colors shrink-0 bg-[#0066cc]/10 text-[#0066cc] group-hover:bg-[#0066cc]/20">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1D1D1F] truncate leading-snug">
                      {template.name}
                    </p>
                    <p className="text-[10px] text-[#86868B] font-bold mt-0.5 leading-none">
                      {template.items.length}개 항목 자동입력
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    id={`template-more-btn-${template.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTemplateActionsId(openTemplateActionsId === template.id ? null : template.id);
                    }}
                    className="p-2 text-[#86868B] hover:bg-[#1D1D1F]/5 rounded-xl transition-all shrink-0"
                    title="더보기"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Swipe Actions Sliding Overlay */}
                <AnimatePresence>
                  {openTemplateActionsId === template.id && (
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: '0%' }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent clicking on actions container from closing or activating parent card
                      }}
                      className="absolute inset-y-0 right-0 z-50 bg-[#F5F5F7]/95 backdrop-blur-md border-l border-gray-100/50 flex items-center px-3 gap-2 h-full rounded-r-[18px]"
                      style={{ width: '112px' }}
                    >
                      <button
                        id={`template-edit-btn-overlay-${template.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/settings/batch/edit/${template.id}`);
                          setOpenTemplateActionsId(null);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-[#0066cc] text-white active:opacity-85 rounded-[11px] transition-all font-semibold shrink-0 shadow-none"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`template-delete-btn-overlay-${template.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template);
                          setOpenTemplateActionsId(null);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-[#FF3B30] text-white active:opacity-85 rounded-xl transition-all font-semibold shrink-0 shadow-sm"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </section>

      <AnimatePresence>
        {ledgerToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" onClick={() => setLedgerToDelete(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100">
               <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#FF3B30] mb-6 mx-auto">
                 <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-[#1D1D1F] text-center mb-2">가계부 삭제</h3>
               <p className="text-sm text-[#86868B] text-center mb-8 leading-relaxed font-medium">정말로 '{ledgerToDelete.name}' 가계부를 삭제하시겠습니까?</p>
               <div className="flex flex-col gap-2">
                 <button onClick={confirmDelete} className="theme-btn-primary bg-[#FF3B30] hover:bg-[#FF453A] w-full">네, 삭제하겠습니다</button>
                 <button onClick={() => setLedgerToDelete(null)} className="theme-btn-secondary w-full">취소</button>
               </div>
            </motion.div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[1.25rem] shadow-none border border-gray-100 overflow-hidden p-8 pt-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#0066cc] rounded-[11px] flex items-center justify-center text-white"><Plus className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold text-[#1D1D1F]">새 가계부 만들기</h3>
                </div>
                <div className="space-y-8 mt-6">
                  <input type="text" value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} placeholder="예: 2024 프로젝트 자금" className="theme-input w-full font-bold" autoFocus />
                  <div className="flex gap-3 pb-4">
                    <button onClick={() => setShowCreateModal(false)} className="theme-btn-secondary flex-1">취소</button>
                    <button onClick={handleCreateLedger} className="theme-btn-primary flex-1">생성</button>
                  </div>
                </div>
            </motion.div>
          </div>
        )}

        {templateToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" onClick={() => setTemplateToDelete(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100">
               <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#FF3B30] mb-6 mx-auto">
                 <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-[#1D1D1F] text-center mb-2">템플릿 삭제</h3>
               <p className="text-sm text-[#86868B] text-center mb-8 leading-relaxed font-semibold">정말로 '{templateToDelete.name}' 템플릿을 삭제하시겠습니까?</p>
               <div className="flex flex-col gap-2">
                 <button onClick={confirmDeleteTemplate} className="theme-btn-primary bg-[#FF3B30] hover:bg-[#FF453A] w-full">네, 삭제하겠습니다</button>
                 <button onClick={() => setTemplateToDelete(null)} className="theme-btn-secondary w-full">취소</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Snackbar / Toast UI */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-12 left-1/2 z-[100] min-w-[280px]"
          >
            <div className={cn(
              "px-6 py-3 rounded-[11px] shadow-none border border-gray-100 backdrop-blur-md flex items-center justify-center gap-2",
              toast.type === 'success' && "bg-[#1D1D1F] text-white",
              toast.type === 'info' && "bg-[#0066cc] text-white",
              toast.type === 'error' && "bg-[#FF3B30] text-white"
            )}>
              {toast.type === 'success' && <Check className="w-4 h-4 text-green-400" />}
              {toast.type === 'info' && <Zap className="w-4 h-4 text-white" />}
              {toast.type === 'error' && <X className="w-4 h-4 text-white" />}
              <span className="text-sm font-bold tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-12 text-center">
        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.4em]">Designed by GULBZZUS Team</p>
      </div>
    </div>
  );
}
