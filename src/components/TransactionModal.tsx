import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, X, Check, Plus, Trash2, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  addTransaction, 
  updateTransaction, 
  subscribeSubCategories, 
  subscribeAccountCards,
} from '../services/transactionService';
import { getOrCreateAppFolder, uploadToDrive, downloadDriveFile } from '../services/googleDriveService';
import { Transaction, TransactionType, SubCategory, AccountCard } from '../types';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction;
}

const DriveImage = ({ url, accessToken, className }: { url: string, accessToken: string | null, className?: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      return;
    }

    if (!url.startsWith('drive://') || !accessToken) {
      setSrc(url);
      return;
    }

    const fileId = url.replace('drive://', '');
    let objectUrl: string | null = null;
    
    setLoading(true);
    downloadDriveFile(accessToken, fileId)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(err => {
        console.error('Failed to load drive image:', err);
        setSrc(null);
      })
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, accessToken]);

  if (loading) return <div className={cn("bg-gray-100 animate-pulse rounded-2xl", className)} />;
  
  if (!src) {
    return (
      <div className={cn("bg-gray-100 flex flex-col items-center justify-center gap-1 rounded-2xl", className)}>
        <ImageIcon className="w-4 h-4 text-gray-300" />
        <span className="text-[8px] text-gray-400 font-bold">{url ? 'Error' : 'No Image'}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className={className} 
      alt="Receipt" 
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = 'https://via.placeholder.com/150?text=Error';
      }}
    />
  );
};

export default function TransactionModal({ isOpen, onClose, editingTransaction }: Props) {
  const { user, accessToken, clearAccessToken } = useAuth();
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [accountCards, setAccountCards] = useState<AccountCard[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectionState, setSelectionState] = useState<{
    isOpen: boolean;
    type: 'subCategory' | 'accountCard';
    title: string;
  }>({
    isOpen: false,
    type: 'subCategory',
    title: '',
  });

  const [formData, setFormData] = useState({
    amount: '',
    memo: '',
    category: '',
    subCategory: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as TransactionType,
    settlementStatus: 'N/A',
    marker: false,
    newSubCategory: '',
    transferId: '',
    settledFromAccount: '',
    settledToAccount: '',
    photoUrls: [] as string[],
  });

  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubSub = subscribeSubCategories(user.uid, setSubCategories);
    const unsubAcc = subscribeAccountCards(user.uid, setAccountCards);
    return () => {
      unsubSub();
      unsubAcc();
    };
  }, [user]);

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        amount: editingTransaction.amount.toString(),
        memo: editingTransaction.memo,
        category: editingTransaction.category,
        subCategory: editingTransaction.subCategory || '',
        paymentMethod: editingTransaction.paymentMethod,
        date: editingTransaction.date.split('T')[0],
        type: editingTransaction.type,
        settlementStatus: editingTransaction.settlementStatus || 'N/A',
        marker: editingTransaction.marker || false,
        newSubCategory: editingTransaction.newSubCategory || '',
        transferId: editingTransaction.transferId || '',
        settledFromAccount: editingTransaction.settledFromAccount || '',
        settledToAccount: editingTransaction.settledToAccount || '',
        photoUrls: editingTransaction.photoUrls || [],
      });
    } else {
      setFormData({
        amount: '',
        memo: '',
        category: '',
        subCategory: '',
        paymentMethod: accountCards.find(a => a.isFavorite)?.name || accountCards[0]?.name || '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        settlementStatus: 'N/A',
        marker: false,
        newSubCategory: '',
        transferId: '',
        settledFromAccount: '',
        settledToAccount: '',
        photoUrls: [],
      });
    }
    setReceiptFiles([]); // Clear newly selected files on state change
  }, [editingTransaction, isOpen, accountCards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUploading(true);
    try {
      let photoUrls = [...formData.photoUrls];

      // Upload to Google Drive if files exist and we have an accessToken
      if (receiptFiles.length > 0) {
        if (accessToken) {
          try {
            const folderId = await getOrCreateAppFolder(accessToken);
            const uploadPromises = receiptFiles.map(file => uploadToDrive(accessToken, file, folderId));
            const results = await Promise.all(uploadPromises);
            const newUrls = results.map(res => `drive://${res.id}`);
            photoUrls = [...photoUrls, ...newUrls];
          } catch (error) {
            console.error('Google Drive upload failed:', error);
            if (error instanceof Error && (error.message.includes('인증') || error.message.includes('권한'))) {
              clearAccessToken();
            }
            alert(error instanceof Error ? error.message : '구글 드라이브 업로드에 실패했습니다.');
          }
        } else {
          alert('구글 드라이브 인증 정보가 없습니다. 다시 로그인 해주세요.');
        }
      }

      const data = {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString(),
        createdAt: editingTransaction?.createdAt || new Date().toISOString(),
        photoUrls, // Updated URLs from Drive
      };

      if (editingTransaction) {
        await updateTransaction(user.uid, editingTransaction.id, data);
      } else {
        await addTransaction(user.uid, data);
      }
      setReceiptFiles([]);
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectOption = (name: string) => {
    if (selectionState.type === 'subCategory') {
      setFormData({ ...formData, subCategory: name });
    } else {
      setFormData({ ...formData, paymentMethod: name });
    }
    setSelectionState({ ...selectionState, isOpen: false });
  };

  const transactionTypes: { value: TransactionType; label: string; color: string }[] = [
    { value: 'expense', label: '지출', color: 'bg-rose-500' },
    { value: 'income', label: '수입', color: 'bg-emerald-500' },
    { value: 'balance_adj', label: '잔액조정', color: 'bg-blue-500' },
    { value: 'transfer', label: '이동', color: 'bg-amber-500' },
  ];

  const settlementOptions = ['대기', '완료', '보류', 'N/A'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceiptFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl mx-auto bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-xl font-display font-bold text-[#5C544E]">
                {editingTransaction ? '내역 수정' : '신규 내역 추가'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32">
              {/* 1. Classification */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">분류</label>
                <div className="grid grid-cols-4 gap-2">
                  {transactionTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.value })}
                      className={cn(
                        "py-3 rounded-2xl text-[11px] font-bold transition-all border-2",
                        formData.type === t.value
                          ? `${t.color} border-transparent text-white shadow-lg scale-[1.02]`
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Amount */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {formData.type === 'balance_adj' ? '기준 금액 (현재 잔액)' : '금액'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-[#8B9178] focus:ring-0 rounded-2xl p-5 text-2xl font-display font-bold text-[#5C544E] text-right pr-14 transition-all"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">원</span>
                </div>
                {formData.type === 'balance_adj' && (
                  <p className="text-[10px] text-gray-400 ml-1 mt-1">이 금액으로 해당 통장의 잔액을 보정합니다.</p>
                )}
              </div>

              {/* 3. Sub Category */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">세부 분류</label>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectionState({ 
                    isOpen: true, 
                    type: 'subCategory', 
                    title: '세부 분류 선택' 
                  })}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 border border-transparent hover:border-gray-200 rounded-2xl transition-all group"
                >
                  <span className={cn(
                    "text-sm font-bold",
                    formData.subCategory ? "text-[#5C544E]" : "text-gray-400"
                  )}>
                    {formData.subCategory || '분류를 선택하세요'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* 4. From Account / Payment Method */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {formData.type === 'transfer' ? '보내는 통장' : (formData.type === 'balance_adj' ? '대상 통장' : '통장 / 결제수단')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectionState({ 
                    isOpen: true, 
                    type: 'accountCard', 
                    title: formData.type === 'transfer' ? '보내는 통장 선택' : (formData.type === 'balance_adj' ? '대상 통장 선택' : '통장 / 결제수단 선택')
                  })}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 border border-transparent hover:border-gray-200 rounded-2xl transition-all group"
                >
                  <span className={cn(
                    "text-sm font-bold",
                    formData.paymentMethod ? "text-[#5C544E]" : "text-gray-400"
                  )}>
                    {formData.paymentMethod || (formData.type === 'transfer' ? '보내는 통장 선택' : '통장/카드를 선택하세요')}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* Transfer: To Account */}
              {formData.type === 'transfer' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">받는 통장</label>
                  <select
                    value={formData.settledToAccount}
                    onChange={(e) => setFormData({ ...formData, settledToAccount: e.target.value })}
                    className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-[#8B9178] focus:ring-0 rounded-2xl p-4 text-sm font-bold text-[#5C544E] transition-all"
                  >
                    <option value="">선택하세요</option>
                    {accountCards.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.name}</option>
                    ))}
                  </select>
                </motion.div>
              )}

              {/* 5. Memo */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">내용 (선택)</label>
                <input
                  type="text"
                  placeholder="지출 내역에 대한 메모를 입력하세요"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-[#8B9178] focus:ring-0 rounded-2xl p-4 text-sm font-bold text-[#5C544E] transition-all"
                />
              </div>

              {/* 6. Receipts */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">영수증 첨부</label>
                <div className="flex flex-wrap gap-3">
                  <label className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all gap-1">
                    <Plus className="w-5 h-5 text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400">파일 추가</span>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  {/* Render existing photos from DB */}
                  {formData.photoUrls.map((url, i) => (
                    <div key={`db-${i}`} className="w-20 h-20 bg-gray-100 rounded-2xl relative group overflow-hidden border border-gray-100">
                      <DriveImage 
                        url={url} 
                        accessToken={accessToken} 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrls: prev.photoUrls.filter((_, idx) => idx !== i) }))}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Render newly selected files */}
                  {receiptFiles.map((f, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-100 rounded-2xl relative group overflow-hidden border border-gray-100">
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setReceiptFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Settlement Status */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">정산 상태</label>
                <div className="grid grid-cols-4 gap-2">
                  {settlementOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, settlementStatus: opt })}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold transition-all border",
                        formData.settlementStatus === opt
                          ? "bg-[#6B705C] border-transparent text-white shadow-sm"
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Conditional Settlement Accounts */}
                {formData.settlementStatus === '완료' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                  >
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">정산한 통장</label>
                      <select
                        value={formData.settledFromAccount}
                        onChange={(e) => setFormData({ ...formData, settledFromAccount: e.target.value })}
                        className="w-full bg-white border-gray-100 focus:border-[#8B9178] focus:ring-0 rounded-xl p-3 text-[11px] font-bold text-[#5C544E]"
                      >
                        <option value="">선택하세요</option>
                        {accountCards.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">정산받은 통장</label>
                      <select
                        value={formData.settledToAccount}
                        onChange={(e) => setFormData({ ...formData, settledToAccount: e.target.value })}
                        className="w-full bg-white border-gray-100 focus:border-[#8B9178] focus:ring-0 rounded-xl p-3 text-[11px] font-bold text-[#5C544E]"
                      >
                        <option value="">선택하세요</option>
                        {accountCards.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit Button Sticky at Bottom */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                <button
                  type="submit"
                  disabled={isUploading}
                  className={cn(
                    "w-full max-w-2xl mx-auto py-4 sm:py-5 rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-3 pointer-events-auto active:scale-95",
                    isUploading 
                      ? "bg-gray-400 text-white cursor-wait" 
                      : "bg-[#8B9178] text-white shadow-[#8B9178]/20 hover:bg-[#6B705C]"
                  )}
                >
                  {isUploading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  <span className="uppercase tracking-[0.2em] text-xs">
                    {isUploading ? '업로드 중...' : '저장하기'}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Selection Bottom Sheet */}
    <AnimatePresence>
      {selectionState.isOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectionState({ ...selectionState, isOpen: false })}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md mx-auto bg-white rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-display font-bold text-[#5C544E]">{selectionState.title}</h3>
              <button 
                onClick={() => setSelectionState({ ...selectionState, isOpen: false })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Favorites Grouping */}
              {(selectionState.type === 'subCategory' ? subCategories : accountCards).filter(i => i.isFavorite).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">자주 사용하는 항목</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(selectionState.type === 'subCategory' ? subCategories : accountCards)
                      .filter(i => i.isFavorite)
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectOption(item.name)}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl transition-all border text-left",
                            (selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name
                              ? "bg-[#5C544E] border-[#5C544E] text-white"
                              : "bg-white border-gray-100 text-[#5C544E] hover:border-gray-200"
                          )}
                        >
                          <span className="font-bold text-xs truncate">{item.name}</span>
                          {(selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name && (
                            <Check className="w-3 h-3 shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* All Items Grouping */}
              <div className="space-y-3">
                <div className="px-1 text-[10px] font-bold text-gray-300 uppercase tracking-widest">전체 목록</div>
                <div className="space-y-2">
                  {(selectionState.type === 'subCategory' ? subCategories : accountCards)
                    .filter(i => !i.isFavorite || (selectionState.type === 'subCategory' ? subCategories : accountCards).filter(f => f.isFavorite).length === 0)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectOption(item.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl transition-all border",
                          (selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name
                            ? "bg-[#FDFCF8] border-[#8B9178] text-[#8B9178]"
                            : "bg-white border-gray-100 text-[#5C544E] hover:border-[#EAE7E0]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-current" />}
                          <span className="font-bold text-sm">{item.name}</span>
                        </div>
                        {(selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  {(selectionState.type === 'subCategory' ? subCategories : accountCards).length === 0 && (
                    <div className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                      등록된 항목이 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="h-4" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
