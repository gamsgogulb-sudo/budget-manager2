import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { deleteTransaction, updateTransaction, uploadImageToDrive } from '../services/googleSheetsService';
import { CATEGORIES, SETTLEMENT_OPTS, HORSE_ACCOUNTS } from '../constants';
import { useUI } from '../contexts/UIContext';
import { formatCurrency, sortTransactionsChronologically, generateUniqueId } from '../utils/analysisUtils';

interface HistoryProps {
  transactions: Transaction[];
  refreshData: () => void;
  subcategories: string[];
  accounts: string[];
  incomeSources: string[];
}

// --- Icons ---
const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChevronLeft = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const History: React.FC<HistoryProps> = ({ transactions: propTransactions, refreshData, subcategories, accounts, incomeSources }) => {
  const { showSnackbar, showConfirm } = useUI();

  // --- States ---
  const [viewMode, setViewMode] = useState<'calendar' | 'custom'>('calendar');
  const [anchorDate, setAnchorDate] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState<string | null>(null); 
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  
  // Custom range states
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSettlement, setFilterSettlement] = useState('all');
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [editCostDisplay, setEditCostDisplay] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- Helpers ---
  const toYMD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
  };

  const truncate = (text: string, max: number = 20) => {
      if (!text) return '';
      return text.length > max ? text.slice(0, max) + '...' : text;
  };

  // --- Calendar Logic ---
  const { calendarDays, currentWeekRange } = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); 
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }

    // Determine visible week based on anchorDate
    const targetDateStr = toYMD(anchorDate);
    let targetIndex = days.findIndex(d => d && toYMD(d) === targetDateStr);
    
    if (targetIndex === -1) targetIndex = days.length - 1;
    
    const rowStart = Math.floor(targetIndex / 7) * 7;
    const week = days.slice(rowStart, rowStart + 7);
    
    const weekRange = {
        start: week.find(d => d !== null) || new Date(),
        end: [...week].reverse().find(d => d !== null) || new Date()
    };

    return { 
        calendarDays: isCalendarExpanded ? days : week,
        currentWeekRange: weekRange
    };
  }, [anchorDate, isCalendarExpanded]);

  const dailyStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number }> = {};
    propTransactions.forEach(t => {
        if (!stats[t.date]) stats[t.date] = { income: 0, expense: 0 };
        if (t.cost > 0 && !t.category.includes('이동')) stats[t.date].income += t.cost;
        else if (t.cost < 0 && !t.category.includes('이동')) stats[t.date].expense += Math.abs(t.cost);
    });
    return stats;
  }, [propTransactions]);

  // --- Filtering Logic (Strictly within current period) ---
  const filteredData = useMemo(() => {
    const targetYM = `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, '0')}`;
    const weekStartStr = toYMD(currentWeekRange.start);
    const weekEndStr = toYMD(currentWeekRange.end);

    return propTransactions
      .filter(t => {
        let isInPeriod = false;

        // 1. Date Period Logic
        if (viewMode === 'custom') {
            isInPeriod = (t.date >= customStart && t.date <= customEnd);
        } else {
            if (selectedDay) {
                isInPeriod = (t.date === selectedDay);
            } else if (isCalendarExpanded) {
                // 월간 모드 리스트
                isInPeriod = t.date.startsWith(targetYM);
            } else {
                // 주간 모드 리스트
                isInPeriod = (t.date >= weekStartStr && t.date <= weekEndStr);
            }
        }

        if (!isInPeriod) return false;

        // 2. Search Keyword Filter (Within period)
        if (search) {
          const target = `
            ${t.note || ''}
            ${t.account || ''}
            ${t.subcategory || ''}
            ${t.category || ''}
            ${t.cost || ''}
            ${t.incomeSource || ''}
            ${t.settlement || ''}
            ${t.settlementFromAccount || ''}
            ${t.settlementToAccount || ''}
          `.toLowerCase();
          const keywords = search.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');
          if (keywords.length > 0 && !keywords.some(kw => target.includes(kw))) return false;
        }

        // 3. Category & Settlement Filters
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterSettlement !== 'all' && t.settlement !== filterSettlement) return false;

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.inputTime.localeCompare(a.inputTime) || b.uniqueId.localeCompare(a.uniqueId));
  }, [propTransactions, anchorDate, selectedDay, isCalendarExpanded, viewMode, customStart, customEnd, filterCategory, filterSettlement, search, currentWeekRange]);

  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const idToBalance: Record<string, number> = {};
    const chronological = sortTransactionsChronologically(propTransactions);

    chronological.forEach(t => {
        const abs = Math.abs(t.cost);
        balances[t.account] = (balances[t.account] || 0) + t.cost;
        if (t.settlementFromAccount && !HORSE_ACCOUNTS.includes(t.settlementFromAccount)) balances[t.settlementFromAccount] = (balances[t.settlementFromAccount] || 0) - abs;
        if (t.settlementToAccount && !HORSE_ACCOUNTS.includes(t.settlementToAccount)) balances[t.settlementToAccount] = (balances[t.settlementToAccount] || 0) + abs;
        idToBalance[t.uniqueId] = balances[t.account];
    });
    return idToBalance;
  }, [propTransactions]);

  // --- Selection Stats Logic ---
  const selectedStats = useMemo(() => {
      let income = 0;
      let expense = 0;
      propTransactions.forEach(t => {
          if (selectedIds.has(t.uniqueId)) {
              if (t.cost > 0 && !t.category.includes('이동')) income += t.cost;
              else if (t.cost < 0 && !t.category.includes('이동')) expense += Math.abs(t.cost);
          }
      });
      return { income, expense, balance: income - expense };
  }, [selectedIds, propTransactions]);

  // --- Handlers ---
  const handleNavigate = (direction: 'prev' | 'next') => {
    const next = new Date(anchorDate);
    const offset = direction === 'prev' ? -1 : 1;

    if (isCalendarExpanded) {
        // 월간 모드: 1개월씩 이동
        next.setMonth(next.getMonth() + offset);
    } else {
        // 주간 모드: 7일씩 이동
        next.setDate(next.getDate() + (offset * 7));
    }

    setAnchorDate(next);
    setSelectedDay(null);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredData.length && filteredData.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredData.map(t => t.uniqueId)));
      }
  };

  const handleEditCostChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const num = cleaned ? parseInt(cleaned, 10) : 0;
    setEditCostDisplay(num.toLocaleString());
  };

  const toggleSign = () => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, cost: -editingItem.cost });
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    setIsUploading(true);
    showSnackbar('사진 업로드 중...', 'info');
    try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const driveUrl = await uploadImageToDrive(base64Data);
        if (driveUrl) {
            setEditingItem({ ...editingItem, imageUrl: driveUrl });
            showSnackbar('업로드 완료!', 'success');
        }
    } catch (err) {
        showSnackbar('업로드 실패', 'error');
    } finally { setIsUploading(false); }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editingItem) setEditingItem({ ...editingItem, imageUrl: '' });
  };

  const openImageUrl = (e: React.MouseEvent, url: string | undefined) => {
    e.stopPropagation();
    if (url) window.open(url, '_blank');
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.rowIndex) return;
    let costAmount = parseInt(editCostDisplay.replace(/,/g, ''), 10) || 0;
    let finalCost = editingItem.cost < 0 ? -Math.abs(costAmount) : Math.abs(costAmount);
    try {
        await updateTransaction(editingItem.rowIndex, { ...editingItem, cost: finalCost });
        showSnackbar('수정되었습니다.', 'success');
        setEditingItem(null);
        refreshData();
    } catch(e) { showSnackbar('수정 실패.', 'error'); }
  };

  const handleDelete = async (id: string, note: string) => {
    showConfirm(`'${note || "선택한 내역"}'을 삭제하시겠습니까?`, async () => {
        try {
            await deleteTransaction(id);
            showSnackbar('삭제되었습니다.', 'success');
            setEditingItem(null);
            refreshData();
        } catch(e) { showSnackbar('삭제 실패.', 'error'); }
    });
  };

  useEffect(() => {
    if (editingItem) setEditCostDisplay(Math.abs(editingItem.cost).toLocaleString());
  }, [editingItem?.uniqueId]);

  return (
    <div className="pb-24 animate-fade-in min-h-screen relative max-w-md mx-auto">
      
      {/* 1. Navigation Header */}
      <div className="sticky top-0 z-40 bg-gray-50/95 dark:bg-[#000000] backdrop-blur-md -mx-5 px-5 border-b border-gray-200 dark:border-white/10 shadow-sm pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
            <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                <button onClick={() => setViewMode('calendar')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>캘린더</button>
                <button onClick={() => setViewMode('custom')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'custom' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>기간지정</button>
            </div>
            <div className="text-right">
                <h2 className="text-sm font-black dark:text-white">{anchorDate.getFullYear()}년 {anchorDate.getMonth() + 1}월</h2>
            </div>
        </div>
      </div>

      {/* 2. Calendar Selection View */}
      {viewMode === 'calendar' ? (
          <div className="p-2 mb-2 mx-1 transition-all animate-fade-in">
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => handleNavigate('prev')} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><ChevronLeft /></button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isCalendarExpanded ? '월간 모드' : '주간 모드'}</span>
                <button onClick={() => handleNavigate('next')} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><ChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} className={`text-center text-[11px] font-black ${i === 0 ? 'text-red-400/80' : i === 6 ? 'text-blue-400/80' : 'text-gray-400'}`}>{d}</div>
                ))}
            </div>
            <div className={`grid grid-cols-7 gap-y-5 transition-all`}>
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateStr = toYMD(date);
                    const stats = dailyStats[dateStr];
                    const isSelected = selectedDay === dateStr;
                    const isToday = toYMD(new Date()) === dateStr;
                    const dayOfWeek = date.getDay();

                    return (
                        <button key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)} className={`flex flex-col items-center justify-start min-h-[54px] relative group ${isSelected ? 'scale-110 z-10' : 'hover:opacity-70'}`}>
                            <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-full mb-1 transition-all ${
                                isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                                isToday ? 'border-2 border-blue-500 text-blue-500' : 
                                dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'dark:text-gray-300'
                            }`}>
                                {date.getDate()}
                            </span>
                            {stats && (
                                <div className="flex flex-col items-center gap-[1px] w-full px-0.5">
                                    {stats.income > 0 && <div className="text-[7px] font-black text-blue-500 leading-none">+{stats.income >= 10000 ? (stats.income/10000).toFixed(1)+'만' : stats.income.toLocaleString()}</div>}
                                    {stats.expense > 0 && <div className="text-[7px] font-black text-red-500 leading-none">-{stats.expense >= 10000 ? (stats.expense/10000).toFixed(1)+'만' : stats.expense.toLocaleString()}</div>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
          </div>
      ) : (
          <div className="p-4 mx-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl mb-4 animate-fade-in space-y-3 shadow-sm">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">조회 기간 설정</div>
              <div className="flex items-center gap-3">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl h-12 px-4 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
                  <span className="text-gray-400 font-bold">~</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl h-12 px-4 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
              </div>
          </div>
      )}

      {/* 3. Filter & Search Bar */}
      <div className="relative my-4 px-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="키워드 검색 (선택 기간 내)" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm dark:text-white focus:outline-none focus:ring-2 ring-blue-500/20 transition-all h-12 shadow-sm font-medium" />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1">✕</button>}
      </div>

      <div className={`grid ${isSelectMode ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 px-1 mb-6 transition-all`}>
          <button onClick={() => { setIsSelectMode(!isSelectMode); if(isSelectMode) setSelectedIds(new Set()); }} className={`h-11 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center shadow-sm ${isSelectMode ? 'bg-red-500 border-red-500 text-white' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}>
              {isSelectMode ? '취소' : '다중 선택'}
          </button>
          {isSelectMode && (
              <button onClick={toggleSelectAll} className="h-11 rounded-xl text-[10px] font-bold border bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 flex items-center justify-center shadow-sm">
                  {selectedIds.size === filteredData.length && filteredData.length > 0 ? '전체 해제' : '전체 선택'}
              </button>
          )}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-11 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-2 text-[10px] font-bold dark:text-white outline-none appearance-none shadow-sm cursor-pointer">
              <option value="all">모든 분류 ▾</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSettlement} onChange={e => setFilterSettlement(e.target.value)} className="w-full h-11 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-2 text-[10px] font-bold dark:text-white outline-none appearance-none shadow-sm cursor-pointer">
              <option value="all">모든 정산 ▾</option>
              {SETTLEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
      </div>

      {/* --- Selection Summary Bar (RESTORING) --- */}
      {isSelectMode && selectedIds.size > 0 && (
          <div className="sticky top-[108px] z-30 mx-1 mb-4 bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-4 shadow-lg shadow-blue-500/30 animate-scale-in">
              <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{selectedIds.size}건 선택됨</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">초기화</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">선택 수입</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.income)}</div>
                  </div>
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">선택 지출</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.expense)}</div>
                  </div>
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">합계 잔액</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.balance)}</div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. List View */}
      <div className="mt-2 divide-y divide-gray-100 dark:divide-white/5 px-1">
        {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 opacity-60">
                <p className="text-sm font-medium">선택된 기간에 내역이 없습니다.</p>
            </div>
        ) : (
            <>
                {filteredData.map((t) => (
                    <div key={t.uniqueId} onClick={() => isSelectMode ? toggleSelection(t.uniqueId) : setEditingItem(t)} className={`flex items-center justify-between py-4 px-1 transition-colors cursor-pointer active:bg-gray-50 dark:active:bg-white/5 ${selectedIds.has(t.uniqueId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            {isSelectMode && <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selectedIds.has(t.uniqueId) ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>{selectedIds.has(t.uniqueId) && <span className="text-white text-[10px]">✓</span>}</div>}
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-lg shrink-0 border border-gray-200 dark:border-white/5">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t.date.slice(5, 7)}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.date.slice(8, 10)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                                        t.settlement.includes('완료') ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                                        t.settlement.includes('대기') ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' :
                                        'bg-gray-500/10 border-gray-500/20 text-gray-500 dark:text-gray-400'
                                    }`}>{t.settlement.split(' ').pop()}</span>
                                    <div className="font-bold text-gray-900 dark:text-white text-[14px] truncate">{truncate(t.note || t.subcategory)}</div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                                        t.category.includes('지출') ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
                                        t.category.includes('수입') ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>{t.category.replace(/[^\w가-힣]/g, '')}</span>
                                    <span className="font-medium shrink-0">{t.account}</span>
                                    {t.incomeSource && <><span className="opacity-30 shrink-0">•</span><span className="text-blue-500 font-bold shrink-0">{t.incomeSource}</span></>}
                                    <span className="opacity-30 shrink-0">•</span>
                                    <span className="truncate">{t.subcategory}</span>
                                    {t.imageUrl && <span className="text-[10px] shrink-0">🧾</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                            <div className={`font-black text-[14px] ${t.cost > 0 ? 'text-blue-500' : t.cost < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {t.cost > 0 ? '+' : ''}{t.cost.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                                {runningBalances[t.uniqueId]?.toLocaleString() || '0'}원
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* 7일 보기일 때만 월간 더보기 노출 */}
                {viewMode === 'calendar' && !isCalendarExpanded && filteredData.length > 0 && !search && !selectedDay && (
                    <div className="py-10 text-center">
                        <button onClick={() => { setIsCalendarExpanded(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-8 py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-xs font-black text-gray-500 hover:text-blue-500 transition-all active:scale-95 shadow-sm">
                            이전 내역 더보기
                        </button>
                    </div>
                )}
            </>
        )}
      </div>

      {/* 5. Edit Modal (Strictly Preserved) */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-sm rounded-[2.5rem] p-7 shadow-2xl border border-gray-200 dark:border-white/10 my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-7">
                    <h3 className="text-lg font-black dark:text-white flex items-center gap-2">상세 내역 수정</h3>
                    <button onClick={() => setEditingItem(null)} className="text-gray-400 p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors"><XIcon /></button>
                </div>
                
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3.5">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">기본 분류</label>
                            <select value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 상태</label>
                            <select value={editingItem.settlement} onChange={(e) => setEditingItem({...editingItem, settlement: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                {SETTLEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    {editingItem.category === '💰수입' && (
                        <div className="animate-fade-in">
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">수입처</label>
                            <select value={editingItem.incomeSource || ''} onChange={(e) => setEditingItem({...editingItem, incomeSource: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                <option value="">(미선택)</option>
                                {incomeSources.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">내용 (메모)</label>
                        <input value={editingItem.note} onChange={(e) => setEditingItem({...editingItem, note: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50" />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">금액</label>
                        <div className="flex gap-2.5">
                             <button onClick={toggleSign} className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 shrink-0 ${editingItem.cost < 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-500'}`}>+/-</button>
                             <div className="relative flex-1">
                                <input type="text" inputMode="numeric" value={editCostDisplay} onChange={(e) => handleEditCostChange(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-2xl font-black dark:text-white outline-none text-right pr-4 focus:ring-2 ring-blue-500/20" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                    <span className={`font-black text-xl ${editingItem.cost < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {editingItem.cost < 0 ? '−' : editingItem.cost > 0 ? '+' : ''}
                                    </span>
                                    <span className="text-gray-400 font-bold">₩</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                         <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">날짜</label>
                            <input value={editingItem.date} type="date" onChange={(e) => setEditingItem({...editingItem, date: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none appearance-none" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">상세 항목</label>
                            <select value={editingItem.subcategory} onChange={(e) => setEditingItem({...editingItem, subcategory: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="col-span-2">
                             <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">결제 수단 / 통장</label>
                             <select value={editingItem.account} onChange={(e) => setEditingItem({...editingItem, account: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 출금 통장</label>
                            <select value={editingItem.settlementFromAccount || ''} onChange={(e) => setEditingItem({...editingItem, settlementFromAccount: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                <option value="">(미선택)</option>
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 입금 통장</label>
                            <select value={editingItem.settlementToAccount || ''} onChange={(e) => setEditingItem({...editingItem, settlementToAccount: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                <option value="">(미선택)</option>
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-2 block uppercase tracking-tight">영수증 / 증빙 자료</label>
                        {editingItem.imageUrl ? (
                            <div className="space-y-2.5 animate-fade-in">
                                <div className="flex gap-2.5">
                                    <button onClick={(e) => openImageUrl(e, editingItem.imageUrl)} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">🖼️ 원본 확인</button>
                                    <button onClick={handleRemoveImage} className="w-14 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 active:scale-95 transition-all shadow-sm" title="이미지 삭제"><XIcon /></button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" id="edit-receipt-upload" disabled={isUploading} />
                                <label htmlFor="edit-receipt-upload" className={`w-full h-14 flex items-center justify-center rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] cursor-pointer ${isUploading ? 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 opacity-60' : 'border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50'}`}>
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-tight">
                                        {isUploading ? '⏳ 이미지 업로드 중...' : '📸 영수증 사진 업로드'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-3.5 mt-10">
                    <button onClick={() => handleDelete(editingItem.uniqueId, editingItem.note)} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-sm">삭제</button>
                    <button onClick={handleUpdate} className="flex-[2.5] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 active:scale-95 transition-transform">저장</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default History;