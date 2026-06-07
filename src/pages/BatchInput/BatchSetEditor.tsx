import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Trash2, ChevronLeft, Save, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, RefreshCw, ChevronRight, CreditCard, LayoutGrid,
  Check, X, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLedgers } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { addBatchEntrySet, updateBatchEntrySet, subscribeBatchEntrySets } from '../../services/transactionService';
import { BatchEntrySet, BatchEntryItem, Transaction } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import TransactionModal from '../../components/TransactionModal';

export default function BatchSetEditor() {
  const navigate = useNavigate();
  const { setId } = useParams();
  const { currentLedger } = useLedgers();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [items, setItems] = useState<BatchEntryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!setId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!setId || !currentLedger || !user) return;

    const unsubscribe = subscribeBatchEntrySets(currentLedger.id, (data) => {
      const existing = data.find(s => s.id === setId);
      if (existing) {
        setName(existing.name);
        setItems(existing.items);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setId, currentLedger, user]);

  const openAddItemModal = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const openEditItemModal = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: any) => {
    const newItem: BatchEntryItem = {
      type: data.type,
      category: data.category || '기타',
      subCategory: data.subCategory || '',
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      memo: data.memo,
      settledFromAccount: data.settledFromAccount,
      settledToAccount: data.settledToAccount,
    };

    if (editingIndex !== null) {
      setItems(items.map((item, i) => i === editingIndex ? newItem : item));
    } else {
      setItems([...items, newItem]);
    }
    setIsModalOpen(false);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }
    if (items.length === 0) {
      alert('최소 하나 이상의 항목을 추가해주세요.');
      return;
    }
    if (!currentLedger || !user) return;

    setSaving(true);
    try {
      const data = { name, items };
      if (setId) {
        await updateBatchEntrySet(currentLedger.id, setId, data);
      } else {
        await addBatchEntrySet(currentLedger.id, user.uid, data);
      }
      setToast({ message: '템플릿이 저장되었습니다.', type: 'success' });
    } catch (error) {
      setToast({ message: '저장 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Convert BatchEntryItem to a format TransactionModal can use for "editingTransaction" prop
  const getEditingTransaction = (): Transaction | undefined => {
    if (editingIndex === null) return undefined;
    const item = items[editingIndex];
    return {
      id: `temp-${editingIndex}`,
      amount: item.amount || 0,
      memo: item.memo || '',
      category: item.category || '',
      subCategory: item.subCategory || '',
      paymentMethod: item.paymentMethod || '',
      type: item.type,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      ownerId: user?.uid || '',
      settlementStatus: 'N/A',
      marker: false,
      newSubCategory: '',
      settledFromAccount: item.settledFromAccount,
      settledToAccount: item.settledToAccount,
    } as Transaction;
  };

  return (
    <div className="w-full space-y-8 pb-32">
      <header className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-[#1D1D1F]" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="템플릿 이름을 입력해주세요"
              className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1D1D1F] bg-transparent border-b border-transparent focus:border-gray-200 hover:border-gray-100 outline-none w-full transition-all py-1 placeholder:text-gray-300 truncate"
            />
          </div>
        </div>
        <button
          disabled={saving}
          onClick={handleSave}
          className="h-10 px-4 bg-[#0066cc] text-white font-bold text-sm rounded-full flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>저장</span>
            </>
          )}
        </button>
      </header>

      <section className="space-y-6">
        <div className="px-1 flex items-center justify-between">
          <h2 className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">항목 리스트 ({items.length})</h2>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="theme-card p-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-100 bg-gray-50/30">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#86868B]">
                <Plus className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-[#86868B] font-medium text-sm">추가된 항목이 없습니다.<br/>플러스 버튼을 눌러 항목을 추가하세요.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => {
                const amountColor = item.type === 'income' ? 'text-[#34C759]' : 
                                    item.type === 'expense' ? 'text-[#FF3B30]' :
                                    item.type === 'balance_adj' ? 'text-[#0066cc]' : 'text-[#FF9500]';
                return (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => openEditItemModal(index)}
                    className="theme-card p-4 flex items-center justify-between group hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      {/* Icon Badge */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        item.type === 'income' ? "bg-[#34C759]/10 text-[#34C759]" :
                        item.type === 'expense' ? "bg-[#FF3B30]/10 text-[#FF3B30]" :
                        "bg-[#0066cc]/10 text-[#0066cc]"
                      )}>
                        {item.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : 
                         item.type === 'expense' ? <ArrowDownRight className="w-5 h-5" /> : 
                         <RefreshCw className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Top Row: Note (memo) */}
                        <div className="flex items-center gap-1.5 mb-1 min-w-0">
                          <span className="text-sm font-bold text-[#1D1D1F] truncate">
                            {item.memo || item.subCategory || item.category || '내역 없음'}
                          </span>
                        </div>

                        {/* Bottom Row: Type badge + Account + SubCategory */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#86868B] font-semibold whitespace-nowrap overflow-hidden">
                          <span className={cn(
                            "px-1.5 py-[1px] rounded-[6px] text-[8px] font-bold border shrink-0",
                            item.type === 'income' ? 'bg-[#34C759]/10 border-[#34C759]/20 text-[#34C759]' :
                            item.type === 'expense' ? 'bg-[#FF3B30]/10 border-[#FF3B30]/20 text-[#FF3B30]' :
                            item.type === 'transfer' ? 'bg-[#0066cc]/10 border-[#0066cc]/20 text-[#0066cc]' :
                            'bg-[#F2F2F7] border-transparent text-[#1D1D1F]'
                          )}>
                            {item.type === 'income' ? '수입' : item.type === 'expense' ? '지출' : item.type === 'transfer' ? '이체' : '정산'}
                          </span>
                          
                          <span className="truncate max-w-[100px]">
                            {item.type === 'transfer' ? (
                              <span className="flex items-center gap-0.5">
                                <span>{item.paymentMethod}</span>
                                <ChevronRight className="w-2 h-2 text-gray-300" />
                                <span>{item.settledToAccount}</span>
                              </span>
                            ) : item.paymentMethod}
                          </span>
                          
                          {item.subCategory && (
                            <>
                              <span className="opacity-30 shrink-0">•</span>
                              <span className="text-[#0066cc] font-bold truncate max-w-[100px]">
                                {item.subCategory}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Section & Actions */}
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <p className={cn("text-sm font-black tracking-tight", amountColor)}>
                          {item.type === 'expense' ? '-' : item.type === 'income' ? '+' : ''}
                          {formatCurrency(item.amount || 0)}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => removeItem(e, index)}
                        className="p-2 text-[#FF3B30] opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={openAddItemModal}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#0066cc] text-white rounded-full flex items-center justify-center shadow-none z-50"
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* Item Editor Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLocalSubmit={handleModalSubmit}
        editingTransaction={getEditingTransaction()}
        title={editingIndex !== null ? '항목 수정' : '항목 추가'}
        disableDate={true}
      />

      {/* Snackbar / Toast UI */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-12 left-1/2 z-[100] min-w-[200px]"
          >
            <div className={cn(
              "px-6 py-3 rounded-2xl shadow-xl border border-white/20 backdrop-blur-xl flex items-center justify-center gap-2",
              toast.type === 'success' ? "bg-[#1D1D1F] text-white" : "bg-[#FF3B30] text-white"
            )}>
              {toast.type === 'success' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <X className="w-4 h-4 text-white" />
              )}
              <span className="text-sm font-bold tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
