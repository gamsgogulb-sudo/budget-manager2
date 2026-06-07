import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Layers, CreditCard, Star, Check } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SubCategory, AccountCard } from '../types';
import { 
  addSubCategory, 
  addAccountCard,
  updateSubCategory,
  updateAccountCard
} from '../services/transactionService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'subCategory' | 'accountCard';
  items: (SubCategory | AccountCard)[];
  ledgerId: string;
  userId: string;
}

export default function DynamicListEditor({ isOpen, onClose, type, items, ledgerId, userId }: Props) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    
    if (type === 'subCategory') {
      await addSubCategory(ledgerId, userId, newValue.trim());
    } else {
      await addAccountCard(ledgerId, userId, newValue.trim());
    }
    setNewValue('');
  };

  const handleUpdate = async (id: string) => {
    if (!editingValue.trim()) return;
    const fn = type === 'subCategory' ? updateSubCategory : updateAccountCard;
    await fn(ledgerId, id, { name: editingValue.trim() });
    setEditingId(null);
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('이 항목을 삭제하시겠습니까? 관련 내역에는 영향을 주지 않지만 리스트에서 사라집니다.')) {
      const collection = type === 'subCategory' ? 'subCategories' : 'accountCards';
      await deleteDoc(doc(db, `ledgers/${ledgerId}/${collection}/${itemId}`));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[320] flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[1.25rem] shadow-none overflow-hidden border border-gray-100"
          >
            <div className="w-full flex justify-center pt-4 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-100 rounded-full" />
            </div>

            <div className="p-8 pb-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-[11px] flex items-center justify-center text-white",
                  type === 'subCategory' ? "bg-[#0066cc]" : "bg-[#1D1D1F]"
                )}>
                  {type === 'subCategory' ? <Layers className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F]">
                  {type === 'subCategory' ? '분류 관리' : '결제 수단 관리'}
                </h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-[#86868B]" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleAdd} className="flex gap-3">
                <input
                  type="text"
                  placeholder="새 항목 추가..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="theme-input flex-1 font-bold"
                />
                <button type="submit" className={cn(
                  "theme-btn-primary w-14 h-14 p-0 shrink-0 rounded-[11px]",
                  type === 'subCategory' ? "bg-[#0066cc]" : "bg-[#1D1D1F]"
                )}>
                  <Plus className="w-7 h-7" />
                </button>
              </form>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-sm font-bold text-[#86868B] uppercase tracking-widest">목록이 비어있습니다</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between h-14 px-5 bg-[#F5F5F7] rounded-[11px] group border border-transparent hover:border-[#0066cc]/20 transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0 h-full">
                        <button 
                          type="button"
                          onClick={() => {
                            const fn = type === 'subCategory' ? updateSubCategory : updateAccountCard;
                            fn(ledgerId, item.id, { isFavorite: !item.isFavorite });
                          }}
                          className={cn(
                            "w-9 h-9 rounded-[11px] transition-all flex-shrink-0 flex items-center justify-center",
                            item.isFavorite ? "text-[#0066cc] bg-white" : "text-[#86868B] hover:bg-white bg-white/50"
                          )}
                        >
                          <Star className={cn("w-4 h-4", item.isFavorite && "fill-current")} />
                        </button>
                        
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2 flex-1 h-full">
                            <input
                              autoFocus
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleUpdate(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdate(item.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 h-10 bg-white border-2 border-[#0066cc] rounded-[11px] px-4 text-sm font-bold text-[#1D1D1F] focus:ring-0"
                            />
                            <button onClick={() => handleUpdate(item.id)} className="p-2 text-[#0066cc]"><Check className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingValue(item.name);
                            }}
                            className="text-base font-bold text-[#1D1D1F] truncate cursor-pointer hover:text-[#0066cc] flex-1 leading-none"
                          >
                            {item.name}
                          </span>
                        )}
                      </div>
                      <button 
                         type="button"
                         onClick={() => handleDelete(item.id)}
                         className="w-9 h-9 rounded-[11px] text-[#FF3B30] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-8 border-t border-gray-50">
               <button 
                 type="button"
                 onClick={onClose}
                 className="theme-btn-primary w-full"
               >
                 수정 완료
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Utility to handle class joining (same as lib/utils.ts)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
