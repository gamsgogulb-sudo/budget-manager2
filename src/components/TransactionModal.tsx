import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, X, Check, Plus, Trash2, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import DynamicListEditor from '../components/DynamicListEditor';
import { 
  addTransaction, 
  updateTransaction, 
  subscribeSubCategories, 
  subscribeAccountCards,
} from '../services/transactionService';
import { getOrCreateAppFolder, uploadToDrive, downloadDriveFile } from '../services/googleDriveService';
import { Transaction, TransactionType, SubCategory, AccountCard } from '../types';
import { cn, getLocalDateString } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLocalSubmit?: (data: any) => void;
  editingTransaction?: Transaction;
  title?: string;
  disableDate?: boolean;
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

export default function TransactionModal({ isOpen, onClose, onLocalSubmit, editingTransaction, title, disableDate }: Props) {
  const { user, accessToken, clearAccessToken } = useAuth();
  const { currentLedger } = useLedgers();
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
    date: getLocalDateString(),
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
  const [isListEditorOpen, setIsListEditorOpen] = useState(false);
  const [listEditorType, setListEditorType] = useState<'subCategory' | 'accountCard'>('subCategory');

  useEffect(() => {
    if (!user || !currentLedger) return;
    const unsubSub = subscribeSubCategories(currentLedger.id, setSubCategories);
    const unsubAcc = subscribeAccountCards(currentLedger.id, setAccountCards);
    return () => {
      unsubSub();
      unsubAcc();
    };
  }, [user, currentLedger?.id]);

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
        date: getLocalDateString(),
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
    if (!user || !currentLedger) return;

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
        date: formData.date,
        createdAt: editingTransaction?.createdAt || new Date().toISOString(),
        photoUrls, // Updated URLs from Drive
      };

      if (onLocalSubmit) {
        onLocalSubmit(data);
      } else if (editingTransaction) {
        await updateTransaction(currentLedger.id, editingTransaction.id, data);
      } else {
        await addTransaction(currentLedger.id, user.uid, data);
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
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-white rounded-t-[2rem] sm:rounded-[1.25rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-xl font-display font-bold text-[#5C544E]">
                {title || (editingTransaction ? '내역 수정' : '신규 내역 추가')}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-32">
              {/* 1. Classification */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">거래 유형</label>
                  <div className="grid grid-cols-4 gap-2">
                    {transactionTypes.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t.value })}
                        className={cn(
                          "py-4 rounded-[11px] text-xs font-bold transition-all border-2",
                          formData.type === t.value
                            ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-xl scale-[1.02]"
                            : "bg-white border-gray-100 text-[#86868B] hover:border-gray-200"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
              </div>

              {/* 2. Amount */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">
                  {formData.type === 'balance_adj' ? '기준 금액 (현재 잔액)' : '금액'}
                </label>
                <div className="relative flex items-center bg-[#F5F5F7] rounded-[18px] px-6 py-6 border-2 border-transparent focus-within:bg-white focus-within:border-[#0066cc] focus-within:ring-4 focus-within:ring-[#0066cc]/10 transition-all">
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-transparent border-none p-0 text-3xl font-bold text-[#1D1D1F] text-right focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="flex items-center gap-2 ml-3 shrink-0 select-none">
                    {formData.amount && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: '' })}
                        className="p-1.5 rounded-full bg-gray-200/50 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center active:scale-90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="font-bold text-[#1D1D1F] text-xl">원</span>
                  </div>
                </div>
                {formData.type !== 'balance_adj' && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {[
                      { val: 1000, label: '+1천' },
                      { val: 5000, label: '+5천' },
                      { val: 10000, label: '+1만' },
                      { val: 50000, label: '+5만' },
                      { val: 100000, label: '+10만' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          const current = parseFloat(formData.amount || '0') || 0;
                          setFormData({ ...formData, amount: (current + item.val).toString() });
                        }}
                        className="flex-1 min-w-[54px] py-2.5 rounded-[11px] bg-[#F5F5F7] hover:bg-[#EBEBEB] text-xs font-bold text-[#1D1D1F] transition-all active:scale-95"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Sub Category */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">분류</label>
                  <button
                    type="button"
                    onClick={() => {
                      setListEditorType('subCategory');
                      setIsListEditorOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#0066cc] hover:underline"
                  >
                    편집
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectionState({ 
                    isOpen: true, 
                    type: 'subCategory', 
                    title: '분류 선택' 
                  })}
                  className="w-full flex items-center justify-between p-5 bg-[#F5F5F7] border border-transparent hover:bg-[#EBEBEB] rounded-[11px] transition-all group"
                >
                  <span className={cn(
                    "font-bold",
                    formData.subCategory ? "text-[#1D1D1F]" : "text-[#86868B]"
                  )}>
                    {formData.subCategory || '지출 항목을 선택하세요'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[#86868B] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* 4. From Account / Payment Method */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">
                    {formData.type === 'transfer' ? '출금 통장' : (formData.type === 'balance_adj' ? '대상 통장' : '결제 수단 / 통장')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setListEditorType('accountCard');
                      setIsListEditorOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#0066cc] hover:underline"
                  >
                    편집
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectionState({ 
                    isOpen: true, 
                    type: 'accountCard', 
                    title: formData.type === 'transfer' ? '출금 통장 선택' : '결제 수단 선택'
                  })}
                  className="w-full flex items-center justify-between p-5 bg-[#F5F5F7] border border-transparent hover:bg-[#EBEBEB] rounded-[11px] transition-all group"
                >
                  <span className={cn(
                    "font-bold",
                    formData.paymentMethod ? "text-[#1D1D1F]" : "text-[#86868B]"
                  )}>
                    {formData.paymentMethod || '통장을 선택하세요'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[#86868B] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Transfer: To Account */}
              {formData.type === 'transfer' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">입금 통장</label>
                  <select
                    value={formData.settledToAccount}
                    onChange={(e) => setFormData({ ...formData, settledToAccount: e.target.value })}
                    className="theme-input w-full"
                  >
                    <option value="">선택하세요</option>
                    {accountCards.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.name}</option>
                    ))}
                  </select>
                </motion.div>
              )}

                {/* 5. Date & Memo */}
                <div className={cn(
                  "grid gap-4 sm:gap-6",
                  disableDate ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                )}>
                  {!disableDate && (
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">날짜</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="theme-input w-full appearance-none pr-10"
                          style={{ maxWidth: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">메모 (선택)</label>
                    <input
                      type="text"
                      placeholder="내용을 입력하세요"
                      value={formData.memo}
                      onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                      className="theme-input w-full"
                    />
                  </div>
                </div>

              {/* 6. Receipts */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">사진 / 영수증</label>
                <div className="flex flex-wrap gap-4">
                  <label className="w-24 h-24 bg-[#F5F5F7] border border-gray-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-[#EBEBEB] transition-all gap-1 group">
                    <Plus className="w-6 h-6 text-[#86868B] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-[#86868B]">파일 추가</span>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  {/* Render existing photos */}
                  {formData.photoUrls.map((url, i) => (
                    <div key={`db-${i}`} className="w-24 h-24 bg-[#F5F5F7] rounded-[1.5rem] relative group overflow-hidden border border-gray-100">
                      <DriveImage 
                        url={url} 
                        accessToken={accessToken} 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrls: prev.photoUrls.filter((_, idx) => idx !== i) }))}
                        className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Render new files */}
                  {receiptFiles.map((f, i) => (
                    <div key={i} className="w-24 h-24 bg-[#F5F5F7] rounded-[1.5rem] relative group overflow-hidden border border-gray-100">
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setReceiptFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Settlement Status */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em] ml-1">정산 유무</label>
                <div className="grid grid-cols-4 gap-2">
                  {settlementOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, settlementStatus: opt })}
                      className={cn(
                        "py-4 rounded-xl text-[11px] font-bold transition-all border",
                        formData.settlementStatus === opt
                          ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-sm"
                          : "bg-white border-gray-100 text-[#86868B] hover:border-gray-200"
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
                    className="grid grid-cols-2 gap-4 p-5 bg-[#F5F5F7] rounded-[1.5rem] border border-gray-100"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#86868B] uppercase">보낸 통장</label>
                      <select
                        value={formData.settledFromAccount}
                        onChange={(e) => setFormData({ ...formData, settledFromAccount: e.target.value })}
                        className="w-full bg-white border-gray-100 focus:border-[#007AFF] focus:ring-0 rounded-xl p-3 text-xs font-bold text-[#1D1D1F]"
                      >
                        <option value="">선택</option>
                        {accountCards.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#86868B] uppercase">받은 통장</label>
                      <select
                        value={formData.settledToAccount}
                        onChange={(e) => setFormData({ ...formData, settledToAccount: e.target.value })}
                        className="w-full bg-white border-gray-100 focus:border-[#007AFF] focus:ring-0 rounded-xl p-3 text-xs font-bold text-[#1D1D1F]"
                      >
                        <option value="">선택</option>
                        {accountCards.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit Button Sticky */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-10">
                <button
                  type="submit"
                  disabled={isUploading}
                  className={cn(
                    "theme-btn-primary w-full max-w-2xl mx-auto shadow-2xl pointer-events-auto",
                    isUploading ? "bg-gray-400 text-white cursor-wait" : ""
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
                  <span className="tracking-widest text-sm">
                    {isUploading ? '업로드 중...' : (editingTransaction ? '변경사항 저장' : '내역 추가하기')}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {selectionState.isOpen && (
        <div className="fixed inset-0 z-[310] flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectionState({ ...selectionState, isOpen: false })}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[1.25rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[70vh]"
          >
            <div className="w-full flex justify-center pt-4 pb-1">
              <div className="w-10 h-1 bg-gray-100 rounded-full" />
            </div>
            
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1D1D1F]">{selectionState.title}</h3>
              <button 
                onClick={() => setSelectionState({ ...selectionState, isOpen: false })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#86868B]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-10">
              {/* Favorites Grouping */}
              {(selectionState.type === 'subCategory' ? subCategories : accountCards).filter(i => i.isFavorite).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Star className="w-3.5 h-3.5 text-[#007AFF] fill-current" />
                    <span className="text-[11px] font-bold text-[#007AFF] uppercase tracking-[0.15em]">자주 사용하는 항목</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(selectionState.type === 'subCategory' ? subCategories : accountCards)
                      .filter(i => i.isFavorite)
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectOption(item.name)}
                          className={cn(
                            "flex items-center gap-3 h-14 px-4 rounded-[1.25rem] transition-all border text-left",
                            (selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name
                              ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-lg"
                              : "bg-white border-gray-100 text-[#1D1D1F] hover:bg-[#F5F5F7]"
                          )}
                        >
                          <span className="font-bold text-xs truncate flex-1 leading-none">{item.name}</span>
                          {(selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name && (
                            <Check className="w-4 h-4 shrink-0" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* All Items Grouping */}
              <div className="space-y-4">
                <div className="px-1 text-[11px] font-bold text-[#86868B] uppercase tracking-[0.15em]">전체 목록</div>
                <div className="space-y-2">
                  {(selectionState.type === 'subCategory' ? subCategories : accountCards)
                    .filter(i => !i.isFavorite || (selectionState.type === 'subCategory' ? subCategories : accountCards).filter(f => f.isFavorite).length === 0)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectOption(item.name)}
                        className={cn(
                          "w-full flex items-center justify-between h-14 px-5 rounded-[1.25rem] transition-all border",
                          (selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name
                            ? "bg-[#F5F5F7] border-[#007AFF] text-[#007AFF]"
                            : "bg-white border-transparent text-[#1D1D1F] hover:bg-[#F5F5F7]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-bold text-sm truncate">{item.name}</span>
                          {item.isFavorite && <Star className="w-3 h-3 text-[#007AFF] fill-current" />}
                        </div>
                        {(selectionState.type === 'subCategory' ? formData.subCategory : formData.paymentMethod) === item.name && (
                          <Check className="w-5 h-5 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  {(selectionState.type === 'subCategory' ? subCategories : accountCards).length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-sm font-bold text-[#86868B] uppercase tracking-widest">항목이 없습니다</p>
                      <p className="text-[10px] text-[#86868B] mt-2">상단 메뉴에서 항목을 추가해보세요</p>
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

    <DynamicListEditor
      isOpen={isListEditorOpen}
      onClose={() => setIsListEditorOpen(false)}
      type={listEditorType}
      items={listEditorType === 'subCategory' ? subCategories : accountCards}
      ledgerId={currentLedger?.id || ''}
      userId={user?.uid || ''}
    />
    </>
  );
}
