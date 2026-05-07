import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Layers, CreditCard, Star } from 'lucide-react';
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
  userId: string;
}

export default function DynamicListEditor({ isOpen, onClose, type, items, userId }: Props) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    
    if (type === 'subCategory') {
      await addSubCategory(userId, newValue.trim());
    } else {
      await addAccountCard(userId, newValue.trim());
    }
    setNewValue('');
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('이 항목을 삭제하시겠습니까? 관련 내역에는 영향을 주지 않지만 리스트에서 사라집니다.')) {
      const collection = type === 'subCategory' ? 'subCategories' : 'accountCards';
      await deleteDoc(doc(db, `users/${userId}/${collection}/${itemId}`));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
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
            className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-[#EAE7E0] mt-auto sm:mt-0"
          >
            <div className="p-6 border-b border-[#F9F7F2] flex items-center justify-between bg-[#FDFCF8]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                  type === 'subCategory' ? "bg-[#6B705C]" : "bg-[#A67C52]"
                )}>
                  {type === 'subCategory' ? <Layers className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <h3 className="font-display font-bold text-[#5C544E]">
                  {type === 'subCategory' ? '세부 카테고리 관리' : '통장 / 카드 관리'}
                </h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#EAE7E0] rounded-full transition-colors">
                <X className="w-5 h-5 text-[#5C544E]" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  placeholder="새 항목 이름..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1 bg-[#F9F7F2] border-[#EAE7E0] focus:border-[#8B9178] focus:ring-0 rounded-xl p-3 text-sm font-bold text-[#5C544E]"
                />
                <button type="submit" className={cn(
                  "px-4 rounded-xl text-white shadow-lg transition-all",
                  type === 'subCategory' ? "bg-[#6B705C] shadow-[#6B705C]/20" : "bg-[#A67C52] shadow-[#A67C52]/20"
                )}>
                  <Plus className="w-5 h-5" />
                </button>
              </form>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">등록된 항목이 없습니다</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-[#FDFCF8] border border-[#EAE7E0] rounded-xl group hover:border-[#D9D4C7] transition-all">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            const fn = type === 'subCategory' ? updateSubCategory : updateAccountCard;
                            fn(userId, item.id, { isFavorite: !item.isFavorite });
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            item.isFavorite ? "text-amber-500 bg-amber-50" : "text-gray-300 hover:text-amber-200 hover:bg-amber-50/10"
                          )}
                        >
                          <Star className={cn("w-4 h-4", item.isFavorite && "fill-current")} />
                        </button>
                        <span className="text-sm font-bold text-[#5C544E]">{item.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-6 bg-[#FDFCF8] border-t border-[#F9F7F2]">
               <button 
                onClick={onClose}
                className="w-full bg-[#EAE7E0] text-[#5C544E] py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#D9D4C7] transition-all"
               >
                 닫기
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
