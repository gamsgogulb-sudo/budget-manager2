
import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, SETTLEMENT_OPTS } from '../constants';
import { generateUniqueId, formatCurrency, isSameDate } from '../utils/analysisUtils';
import { addTransaction, addTransfer, updateSubcategories, updateAccounts, updateIncomeSources } from '../services/googleSheetsService';
import { useUI } from '../contexts/UIContext';
import { DashboardData } from '../types';

interface InputProps {
  subcategories: string[];
  accounts: string[];
  incomeSources: string[]; // 수입처 리스트 추가
  refreshData: () => void;
  dashboardData: DashboardData | null;
}

type ViewMode = 'week' | 'month' | 'year';

const SHORTCUTS = [
    { val: 1000, label: '+1천' },
    { val: 5000, label: '+5천' },
    { val: 10000, label: '+1만' },
    { val: 50000, label: '+5만' },
];

// --- Icons ---
const EditIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const Input: React.FC<InputProps> = ({ subcategories, accounts, incomeSources, refreshData, dashboardData }) => {
  const { showSnackbar, showConfirm } = useUI();
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Input State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [incomeSource, setIncomeSource] = useState(''); // 수입처 상태
  const [note, setNote] = useState('');
  const [account, setAccount] = useState(''); // Default account
  const [fromAccount, setFromAccount] = useState(''); // Transfer source
  const [toAccount, setToAccount] = useState('');     // Transfer destination
  const [cost, setCost] = useState('');
  const [settlement, setSettlement] = useState(SETTLEMENT_OPTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State for Management
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageType, setManageType] = useState<'subcategory' | 'account' | 'incomeSource'>('subcategory');
  const [manageList, setManageList] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isSavingList, setIsSavingList] = useState(false);
  
  // Inline Editing State within Modal
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (subcategories.length > 0 && !subcategory) setSubcategory(subcategories[0]);
    if (incomeSources.length > 0 && !incomeSource) setIncomeSource(incomeSources[0]);
    if (accounts.length > 0) {
        if (!account) setAccount(accounts[0]);
        if (!fromAccount) setFromAccount(accounts[0]);
        if (!toAccount) setToAccount(accounts.length > 1 ? accounts[1] : accounts[0]);
    }
  }, [subcategories, accounts, incomeSources]);

  // Current balance for the selected account
  const currentAppBalance = useMemo(() => {
      if (!dashboardData || !account) return 0;
      const bank = dashboardData.bankBalances.find(b => b.name === account);
      return bank ? bank.balance : 0;
  }, [dashboardData, account]);

  // Calculated adjustment amount if in balance adjustment mode
  const balanceAdjustmentDelta = useMemo(() => {
      if (category !== '⚖️잔액조정') return 0;
      const inputVal = parseInt(cost.replace(/,/g, '') || '0', 10);
      return inputVal - currentAppBalance;
  }, [category, cost, currentAppBalance]);

  // --- Management Logic ---

  const handleOpenManage = (type: 'subcategory' | 'account' | 'incomeSource') => {
      setManageType(type);
      setManageList(type === 'subcategory' ? [...subcategories] : type === 'account' ? [...accounts] : [...incomeSources]);
      setNewItemName('');
      setEditingIdx(null);
      setRenameMap({});
      setIsManageModalOpen(true);
  };

  const handleAddItem = () => {
      if (!newItemName.trim()) return;
      if (manageList.includes(newItemName.trim())) {
          showSnackbar('이미 존재하는 항목입니다.', 'error');
          return;
      }
      setManageList([...manageList, newItemName.trim()]);
      setNewItemName('');
  };

  const handleStartEdit = (idx: number) => {
      setEditingIdx(idx);
      setEditingValue(manageList[idx]);
  };

  const handleSaveEdit = () => {
      if (editingIdx === null || !editingValue.trim()) return;
      const oldName = manageList[editingIdx];
      const newName = editingValue.trim();
      
      if (oldName === newName) {
          setEditingIdx(null);
          return;
      }

      const nextList = [...manageList];
      nextList[editingIdx] = newName;
      setManageList(nextList);
      setRenameMap(prev => ({ ...prev, [oldName]: newName }));
      setEditingIdx(null);
  };

  const handleRemoveItem = (index: number) => {
      const item = manageList[index];
      showConfirm(`'${item}' 항목을 삭제하시겠습니까?`, () => {
          const next = manageList.filter((_, i) => i !== index);
          setManageList(next);
          if (editingIdx === index) setEditingIdx(null);
      });
  };

  const handleSaveList = async () => {
      setIsSavingList(true);
      try {
          if (manageType === 'subcategory') {
              await updateSubcategories(manageList, renameMap);
          } else if (manageType === 'account') {
              await updateAccounts(manageList, renameMap);
          } else {
              await updateIncomeSources(manageList, renameMap);
          }
          showSnackbar('리스트가 성공적으로 업데이트되었습니다.', 'success');
          refreshData();
          setIsManageModalOpen(false);
      } catch (e: any) {
          showSnackbar(e.message, 'error');
      } finally {
          setIsSavingList(false);
      }
  };

  // --- Logic for Views ---
  const weekDays = useMemo(() => {
    const current = new Date(viewDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(current).setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }, [viewDate]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  // --- Navigation Handlers ---
  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setFullYear(newDate.getFullYear() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else newDate.setFullYear(newDate.getFullYear() + 1);
    setViewDate(newDate);
  };

  const toggleViewMode = () => {
    if (viewMode === 'week') setViewMode('month');
    else if (viewMode === 'month') setViewMode('year');
    else setViewMode('week');
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(monthIndex);
    newDate.setDate(1);
    setViewDate(newDate);
    setViewMode('month');
  };

  const formatDateForApi = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const displayDayNames = ['월', '화', '수', '목', '금', '토', '일'];

  const handleAmountBtn = (amount: number) => {
    const current = parseInt(cost.replace(/,/g, '') || '0', 10);
    setCost((current + amount).toLocaleString());
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const costNum = parseInt(cost.replace(/,/g, ''), 10);
    if (category !== '⚖️잔액조정' && !costNum) {
        showSnackbar('금액을 입력해주세요.', 'error');
        return;
    }

    if (category !== '➡️이동' && (!account || (category !== '⚖️잔액조정' && !subcategory))) {
      showSnackbar('필수 항목을 모두 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = formatDateForApi(selectedDate);

      if (category === '➡️이동') {
          if (fromAccount === toAccount) {
              showSnackbar('출금 통장과 입금 통장이 같습니다.', 'error');
              setIsSubmitting(false);
              return;
          }
          await addTransfer(costNum, fromAccount, toAccount, dateStr, note, settlement);
      } else {
          let finalCost = costNum;
          let finalSubcategory = subcategory;
          let finalNote = note;

          if (category === '🚨지출') {
              finalCost = -Math.abs(finalCost);
          } else if (category === '💰수입') {
              finalCost = Math.abs(finalCost);
          } else if (category === '⚖️잔액조정') {
              finalCost = balanceAdjustmentDelta;
              finalSubcategory = '잔액조정';
              if (!finalNote) finalNote = `잔액 맞춤 (${formatCurrency(costNum)}으로 리셋)`;
          }

          const newTxn = {
            uniqueId: generateUniqueId(),
            inputTime: new Date().toISOString(),
            category,
            subcategory: finalSubcategory,
            note: finalNote,
            account,
            cost: finalCost,
            date: dateStr,
            settlement,
            imageUrl: previewImage || '',
            incomeSource: category === '💰수입' ? incomeSource : '' // 수입처 저장
          };
          await addTransaction(newTxn);
      }

      showSnackbar('저장되었습니다!', 'success');
      setCost('');
      setNote('');
      setPreviewImage(null);
      refreshData();
    } catch (e) {
      console.error(e);
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderTitle = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    return viewMode === 'year' ? `${y}년` : `${y}년 ${m}월`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Date Selection UI */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">날짜 선택</label>
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrev} className="text-blue-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white transition-colors">
                        {getHeaderTitle()}
                    </span>
                    <button 
                        onClick={toggleViewMode}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {viewMode === 'week' ? '주간' : viewMode === 'month' ? '월간' : '연간'} ▼
                    </button>
                </div>
                <button onClick={handleNext} className="text-blue-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>

            {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-1.5">
                    {weekDays.map((d, i) => {
                        const isSelected = isSameDate(d, selectedDate);
                        return (
                            <button key={i} onClick={() => handleDateClick(d)} className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-400'}`}>
                                <span className={`text-xs mb-1 ${isSelected ? 'opacity-100' : 'opacity-60'}`}>{dayNames[d.getDay()]}</span>
                                <span className={`text-lg font-bold`}>{d.getDate()}</span>
                            </button>
                        )
                    })}
                </div>
            )}
            {viewMode === 'month' && (
                <div>
                    <div className="grid grid-cols-7 mb-2">{displayDayNames.map(day => (<div key={day} className="text-center text-xs text-gray-400 font-medium py-1">{day}</div>))}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} />;
                            const isSelected = isSameDate(d, selectedDate);
                            const isToday = isSameDate(d, new Date());
                            return (
                                <button key={i} onClick={() => handleDateClick(d)} className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${isSelected ? 'bg-blue-600 text-white font-bold' : isToday ? 'border border-blue-500 text-blue-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{d.getDate()}</button>
                            );
                        })}
                    </div>
                </div>
            )}
            {viewMode === 'year' && (
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 12 }, (_, i) => i).map(monthIdx => {
                        const isCurrentMonth = viewDate.getMonth() === monthIdx;
                        return (
                            <button key={monthIdx} onClick={() => handleMonthSelect(monthIdx)} className={`py-4 rounded-xl text-sm font-medium transition-all ${isCurrentMonth ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300'}`}>{monthIdx + 1}월</button>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* Category Selection UI */}
      <div className="space-y-2">
         <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">분류</label>
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-1 min-h-[52px] ${category === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'}`}>
                    {cat}
                </button>
            ))}
         </div>
      </div>

      <div className="space-y-4">
        {/* Cost Input */}
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
             {category === '⚖️잔액조정' ? '실제 통장 잔액 입력' : '금액'}
           </label>
           <div className="relative">
            <input type="text" inputMode="decimal" pattern="[0-9]*" placeholder="0" value={cost} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setCost(val ? parseInt(val).toLocaleString() : ''); }} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-4 text-right text-2xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-300 dark:placeholder-gray-700 pr-12" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₩</span>
            {cost && (<button onClick={() => setCost('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors text-sm font-bold">✕</button>)}
          </div>
          
          {category === '⚖️잔액조정' ? (
              <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 animate-fade-in">
                  <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-500 dark:text-indigo-300 font-bold">앱 내 현재 잔액</span>
                      <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(currentAppBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-indigo-300 font-bold">조정 금액</span>
                      <span className={`font-black ${balanceAdjustmentDelta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {balanceAdjustmentDelta >= 0 ? '+' : ''}{balanceAdjustmentDelta.toLocaleString()}원
                      </span>
                  </div>
              </div>
          ) : (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                {SHORTCUTS.map(item => (<button key={item.label} onClick={() => handleAmountBtn(item.val)} className="flex-1 min-w-[60px] h-[48px] rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</button>))}
              </div>
          )}
        </div>

        {/* Dynamic Fields based on Category */}
        {category === '➡️이동' ? (
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">출금 통장</label>
                    <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">입금 통장</label>
                    <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-2 gap-3">
                    <div className={category === '⚖️잔액조정' ? 'opacity-40 pointer-events-none' : ''}>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">상세 분류</label>
                            <button onClick={() => handleOpenManage('subcategory')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={category === '⚖️잔액조정' ? '잔액조정' : subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {category === '⚖️잔액조정' ? <option>잔액조정</option> : subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">결제수단/통장</label>
                            <button onClick={() => handleOpenManage('account')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                {/* 수입처 필드 추가 - 오직 💰수입일 때만 노출 */}
                {category === '💰수입' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">수입처</label>
                            <button onClick={() => handleOpenManage('incomeSource')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {incomeSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
            </>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">내용 (선택)</label>
          <input type="text" placeholder={category === '⚖️잔액조정' ? '잔액 맞춤 사유 입력' : '내용을 입력하세요'} value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors h-[48px]" />
        </div>

        {/* Receipt / Settlement Row */}
        <div className={`grid grid-cols-2 gap-3 ${category === '⚖️잔액조정' ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">영수증 첨부</label>
                <div className="relative">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="receipt-upload" />
                    <label htmlFor="receipt-upload" className={`w-full h-[48px] flex items-center justify-center rounded-xl border cursor-pointer transition-all ${previewImage ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                        {previewImage ? '📷 변경' : '📷 사진 추가'}
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">정산상태</label>
                <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                    {SETTLEMENT_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
          {isSubmitting ? '저장 중...' : category === '⚖️잔액조정' ? '⚖️ 잔액 조정하기' : '💾 저장하기'}
        </button>
      </div>

      {/* List Management Modal */}
      {isManageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                      <h3 className="text-lg font-bold dark:text-white">
                        {manageType === 'subcategory' ? '상세분류 관리' : manageType === 'account' ? '결제수단 관리' : '수입처 관리'}
                      </h3>
                      <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                  </div>
                  
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        value={newItemName} 
                        onChange={(e) => setNewItemName(e.target.value)} 
                        placeholder="새 항목 추가" 
                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[48px] text-sm dark:text-white outline-none focus:border-blue-500 min-w-0" 
                      />
                      <button onClick={handleAddItem} className="bg-blue-600 text-white px-5 h-[48px] rounded-xl text-sm font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0">추가</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50/30 dark:bg-black/20">
                      {manageList.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-sm italic">등록된 항목이 없습니다.</div>
                      ) : (
                          manageList.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 min-h-[56px] shadow-sm">
                                  {editingIdx === idx ? (
                                      <div className="flex flex-1 items-center gap-2">
                                          <input 
                                            value={editingValue} 
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                            className="flex-1 h-9 bg-white dark:bg-black border border-blue-500 rounded-lg px-2 text-sm dark:text-white outline-none min-w-0"
                                            autoFocus
                                          />
                                          <button onClick={handleSaveEdit} className="text-blue-500 p-2 active:scale-90 shrink-0"><CheckIcon /></button>
                                          <button onClick={() => setEditingIdx(null)} className="text-gray-400 p-2 active:scale-90 shrink-0"><XIcon /></button>
                                      </div>
                                  ) : (
                                      <>
                                          <span className="text-sm font-medium dark:text-gray-200 truncate pr-4">{item}</span>
                                          <div className="flex items-center gap-1 shrink-0">
                                              <button onClick={() => handleStartEdit(idx)} className="text-blue-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><EditIcon /></button>
                                              <button onClick={() => handleRemoveItem(idx)} className="text-red-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><XIcon /></button>
                                          </div>
                                      </>
                                  )}
                              </div>
                          ))
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
                      <button onClick={handleSaveList} disabled={isSavingList} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSavingList ? '데이터 동기화 중...' : '저장 (구글 시트 반영)'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Input;
