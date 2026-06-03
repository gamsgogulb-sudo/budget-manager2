
import { DashboardData, ExpenseStat, Transaction, PeriodType, DashboardViewMode, FixedKeyword, AverageStat, BankBalance } from '../types';
import { formatCurrency, getCustomMonthRange, sortTransactionsChronologically } from '../utils/analysisUtils';
import { updateTransaction, updateFixedKeywords, updateVisibilitySettings, updateManagedAccounts } from '../services/googleSheetsService';
import { HORSE_ACCOUNTS } from '../constants';
import { useUI } from '../contexts/UIContext';
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface DashboardProps {
  data: DashboardData | null;
  isLoading: boolean;
  transactions: Transaction[];
  fixedKeywords: FixedKeyword[];
  managedAccounts: string[];
  allAccounts: string[];
  refreshData: () => void;
}

// --- Icons ---
const ChevronLeft = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const FixedIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" strokeLinecap="round"/><circle cx="12" cy="12" r="3" /></svg>;
const ChartIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const WalletIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
const FlowIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="18" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="2" y="13" width="4" height="8" /></svg>;
const CalendarIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;

// --- Helper Functions ---
const truncate = (text: string, max: number = 25) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '...' : text;
};

// --- Standardized Transaction Card Component ---
const TransactionCard: React.FC<{ t: Transaction; noBg?: boolean; contextAccount?: string; runningBalance?: number }> = ({ t, noBg, contextAccount, runningBalance }) => {
    const isSettlementFrom = contextAccount && t.settlementFromAccount === contextAccount && !HORSE_ACCOUNTS.includes(contextAccount);
    const isSettlementTo = contextAccount && t.settlementToAccount === contextAccount && !HORSE_ACCOUNTS.includes(contextAccount);

    let displayCost = t.cost;
    let costColorClass = "";
    let statusLabel = t.category.replace(/[^\w가-힣]/g, '');

    if (isSettlementFrom) {
        displayCost = -Math.abs(t.cost);
        costColorClass = "text-red-500";
        statusLabel = "정산출금";
    } else if (isSettlementTo) {
        displayCost = Math.abs(t.cost);
        costColorClass = "text-blue-500";
        statusLabel = "정산입금";
    } else {
        const isIncome = t.cost > 0;
        const isTransfer = t.category.includes('이동');
        costColorClass = isTransfer ? (t.subcategory.includes('입금') ? 'text-blue-500' : 'text-red-400') : (isIncome ? 'text-blue-500' : 'text-red-500');
    }
    
    return (
        <div className={`flex items-center justify-between transition-all ${noBg ? 'py-4 px-1' : 'bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/5 p-4'}`}>
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="flex flex-col items-center justify-center w-11 h-11 bg-gray-100 dark:bg-white/10 rounded-xl shrink-0 border border-gray-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t.date.slice(5, 7)}</span>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{t.date.slice(8, 10)}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold shrink-0 ${
                            t.settlement.includes('완료') ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            t.settlement.includes('대기') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                            'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                        }`}>
                            {t.settlement.split(' ').pop()}
                        </span>
                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
                            {truncate(t.note || t.subcategory)}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold shrink-0 ${
                            statusLabel.includes('출금') || statusLabel.includes('지출') ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            statusLabel.includes('입금') || statusLabel.includes('수입') ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            statusLabel.includes('잔액조정') ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' :
                            'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                            {statusLabel}
                        </span>
                        <span className="font-medium shrink-0">{t.account}</span>
                        <span className="opacity-30 shrink-0">•</span>
                        <span className="truncate">{t.subcategory}</span>
                    </div>
                </div>
            </div>
            <div className="text-right shrink-0 ml-3">
                <div className={`font-black text-sm ${costColorClass}`}>
                    {displayCost > 0 ? '+' : ''}{displayCost.toLocaleString()}
                </div>
                {runningBalance !== undefined && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                        잔액: {runningBalance.toLocaleString()}원
                    </div>
                )}
            </div>
        </div>
    );
};

// --- BottomSheetWrapper ---
const BottomSheetWrapper: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
    title: string;
    headerColorClass?: string;
    subtitle?: string;
    noDim?: boolean;
    hideClose?: boolean;
}> = ({ children, onClose, title, headerColorClass = "bg-zinc-900", subtitle, noDim, hideClose }) => {
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) setTranslateY(diff);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (translateY > 100) onClose();
        else setTranslateY(0);
    };

    return (
        <div 
            className={`fixed inset-0 z-[80] flex items-end justify-center animate-fade-in pointer-events-auto ${noDim ? 'bg-transparent' : 'bg-black/40 dark:bg-black/60 backdrop-blur-sm'}`} 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-[#121212] w-full max-md rounded-t-[2.5rem] overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[92vh] transition-transform duration-200 ease-out border-t border-gray-100 dark:border-white/5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ transform: `translateY(${translateY}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
            >
                <div className="w-full flex justify-center py-5 shrink-0 cursor-grab active:cursor-grabbing touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-14 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full"></div>
                </div>
                <div className={`${headerColorClass} px-6 pb-6 pt-0 text-white shrink-0 relative`}>
                    <div className="flex justify-between items-start">
                        <div>
                            {subtitle && <div className="text-[10px] opacity-70 uppercase tracking-widest font-bold mb-1.5">{subtitle}</div>}
                            <div className="text-2xl font-black leading-tight">{title}</div>
                        </div>
                        {!hideClose && (
                            <button onClick={onClose} className="p-2 -mr-2 opacity-50 hover:opacity-100">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- Donut Chart ---
const DonutChart = ({ data, totalAmount, label }: { data: ExpenseStat[], totalAmount: number, label: string }) => {
  const size = 160;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const chartData = useMemo(() => {
      if (data.length <= 8) return data;
      const top = data.slice(0, 7);
      const others = data.slice(7).reduce((acc, curr) => acc + curr.amount, 0);
      return [...top, { name: '기타', amount: others, percentage: (others / totalAmount) * 100, color: '#9CA3AF' }];
  }, [data, totalAmount]);

  if (data.length === 0) return <div className="py-8 text-center text-gray-400 text-xs">데이터가 없습니다</div>;

  return (
    <div className="relative flex justify-center items-center h-48">
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-white/5" />
                {chartData.map((item) => {
                    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += item.percentage;
                    return <circle key={item.name} cx={center} cy={center} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-700" />;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-gray-500 font-medium leading-none mb-1">{label}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{(totalAmount/10000).toFixed(1)}만</span>
            </div>
        </div>
    </div>
  );
};

// --- Main Dashboard ---
const Dashboard: React.FC<DashboardProps> = ({ data: initialData, isLoading, transactions, fixedKeywords, managedAccounts, allAccounts, refreshData }) => {
  const { showSnackbar } = useUI();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('basic');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());

  // Custom range states
  const [customStartDate, setCustomStartDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
      return new Date().toISOString().split('T')[0];
  });
  
  const [hiddenCategoryNames, setHiddenCategoryNames] = useState<Set<string>>(new Set());
  const [hiddenAccountNames, setHiddenAccountNames] = useState<Set<string>>(new Set());
  const [tempManagedAccounts, setTempManagedAccounts] = useState<Set<string>>(new Set());
  
  const [isEditingCategoryVisibility, setIsEditingCategoryVisibility] = useState(false);
  const [isEditingAccountVisibility, setIsEditingAccountVisibility] = useState(false);
  const [isManagingAccounts, setIsManagingAccounts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [analysisTab, setAnalysisTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<ExpenseStat | null>(null);
  const [selectedAvgDetail, setSelectedAvgDetail] = useState<AverageStat | null>(null);
  const [selectedFlowDate, setSelectedFlowDate] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordCategory, setNewKeywordCategory] = useState<'수입' | '지출'>('지출');

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<BankBalance | null>(null);
  const [accountHistoryFilter, setAccountHistoryFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  useEffect(() => {
    if (initialData) {
        setHiddenCategoryNames(new Set(initialData.hiddenCategories));
        setHiddenAccountNames(new Set(initialData.hiddenAccounts));
        setTempManagedAccounts(new Set(managedAccounts));
    }
  }, [initialData, managedAccounts]);

  const handleSaveVisibility = async (type: 'category' | 'account') => {
      setIsSaving(true);
      try {
          await updateVisibilitySettings(Array.from(hiddenCategoryNames), Array.from(hiddenAccountNames));
          showSnackbar('숨김 설정 완료', 'success');
          if (type === 'category') setIsEditingCategoryVisibility(false);
          else setIsEditingAccountVisibility(false);
          refreshData();
      } catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleSaveManagedAccounts = async () => {
      setIsSaving(true);
      try {
          await updateManagedAccounts(Array.from(tempManagedAccounts));
          showSnackbar('대시보드 설정 완료', 'success');
          setIsManagingAccounts(false);
          refreshData();
      } catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleAddKeyword = async () => {
      if (!newKeyword.trim()) return;
      const updated = [...fixedKeywords, { keyword: newKeyword.trim(), category: newKeywordCategory, expectedAmount: 0 }];
      setIsSaving(true);
      try { await updateFixedKeywords(updated); setNewKeyword(''); refreshData(); } 
      catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleRemoveKeyword = async (kw: string) => {
      const updated = fixedKeywords.filter(k => k.keyword !== kw);
      setIsSaving(true);
      try { await updateFixedKeywords(updated); refreshData(); } 
      catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const { startDate, endDate, label, rangeText } = useMemo(() => {
    const start = new Date(anchorDate); const end = new Date(anchorDate);
    const baseDay = initialData?.baseDay || 1;

    if (period === 'custom') {
        const s = new Date(customStartDate);
        const e = new Date(customEndDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        return {
            startDate: s, endDate: e,
            label: '직접 설정 기간',
            rangeText: `${s.toLocaleDateString()} ~ ${e.toLocaleDateString()}`
        };
    } else if (period === 'week') {
        const diff = start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1);
        start.setDate(diff); start.setHours(0,0,0,0); end.setDate(diff + 6); end.setHours(23,59,59,999);
        return { 
            startDate: start, endDate: end, 
            label: `${start.getMonth()+1}/${start.getDate()}~${end.getMonth()+1}/${end.getDate()}`,
            rangeText: `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`
        };
    } else if (period === 'month') {
        const range = getCustomMonthRange(anchorDate, baseDay);
        return { 
            startDate: range.start, endDate: range.end, 
            label: `${range.end.getFullYear()}년 ${range.end.getMonth()+1}월`,
            rangeText: `${range.start.toLocaleDateString()} ~ ${range.end.toLocaleDateString()}`
        };
    } else if (period === 'quarter') {
        const q = Math.floor(start.getMonth() / 3);
        start.setMonth(q * 3); start.setDate(1); start.setHours(0,0,0,0); end.setMonth((q + 1) * 3); end.setDate(0); end.setHours(23,59,59,999);
    } else if (period === 'year') {
        start.setMonth(0, 1); start.setHours(0,0,0,0); end.setMonth(11, 31); end.setHours(23,59,59,999);
    }
    return { 
        startDate: start, endDate: end, 
        label: `${start.getFullYear()}년 ${start.getMonth()+1}월`,
        rangeText: `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`
    };
  }, [period, anchorDate, initialData?.baseDay, customStartDate, customEndDate]);

  const filteredTxns = useMemo(() => transactions.filter(t => {
      const d = new Date(t.date); return d >= startDate && d <= endDate;
  }), [transactions, startDate, endDate]);

  const stats = useMemo(() => {
     let inc = 0, exp = 0, trf = 0;
     const expenseMap: Record<string, number> = {};
     const incomeMap: Record<string, number> = {};
     const transferMap: Record<string, number> = {};
     filteredTxns.forEach(t => {
         const amt = Number(t.cost);
         if (t.category.includes('수입')) { inc += amt; incomeMap[t.subcategory] = (incomeMap[t.subcategory] || 0) + amt; }
         else if (t.category.includes('지출')) { const abs = Math.abs(amt); exp += abs; expenseMap[t.subcategory] = (expenseMap[t.subcategory] || 0) + abs; }
         else if (t.category.includes('이동') && t.subcategory === '이동(입금)') { trf += amt; transferMap[t.account] = (transferMap[t.account] || 0) + amt; }
     });
     const createSortedStats = (map: Record<string, number>, total: number) => {
         return Object.entries(map).map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0, color: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#6B7280'][i % 8] }));
     };
     return { income: inc, expense: exp, transfer: trf, balance: inc - exp, expenseStats: createSortedStats(expenseMap, exp), incomeStats: createSortedStats(incomeMap, inc), transferStats: createSortedStats(transferMap, trf) };
  }, [filteredTxns]);

  const flowData = useMemo(() => {
    const map: Record<string, { income: number, expense: number, dateStr: string }> = {};
    if (period === 'week') {
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate); d.setDate(d.getDate() + i);
            const k = d.toISOString().split('T')[0]; map[k] = { income: 0, expense: 0, dateStr: `${d.getMonth()+1}/${d.getDate()}` };
        }
    } else if (period === 'month' || period === 'custom') {
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // 기간이 너무 길면 월별로 표시 (예: 62일 이상)
        if (totalDays > 62) {
            let cur = new Date(startDate);
            while (cur <= endDate) {
                const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
                map[k] = { income: 0, expense: 0, dateStr: `${cur.getMonth() + 1}월` };
                cur.setMonth(cur.getMonth() + 1);
            }
        } else {
            for (let i = 0; i <= totalDays; i++) {
                const d = new Date(startDate); d.setDate(startDate.getDate() + i);
                const k = d.toISOString().split('T')[0]; map[k] = { income: 0, expense: 0, dateStr: `${d.getMonth()+1}/${d.getDate()}` };
            }
        }
    } else if (period === 'year' || period === 'quarter') {
        const startMonth = startDate.getMonth(); const endMonth = endDate.getMonth(); const y = startDate.getFullYear();
        for (let m = startMonth; m <= endMonth; m++) {
            const k = `${y}-${String(m + 1).padStart(2, '0')}`; map[k] = { income: 0, expense: 0, dateStr: `${m + 1}월` };
        }
    }
    filteredTxns.forEach(t => {
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const k = (period === 'year' || period === 'quarter' || (period === 'custom' && totalDays > 62)) ? t.date.slice(0, 7) : t.date;
        if (map[k]) {
            if (t.cost > 0 && t.category.includes('수입')) map[k].income += t.cost;
            else if (t.cost < 0 && t.category.includes('지출')) map[k].expense += Math.abs(t.cost);
        }
    });
    return Object.entries(map).map(([key, val]) => ({ key, ...val }));
  }, [filteredTxns, period, startDate, endDate]);

  const maxFlowValue = useMemo(() => Math.max(...flowData.map(d => Math.max(d.income, d.expense)), 10000), [flowData]);
  
  // 현재 선택된 흐름 날짜의 요약 데이터 (기간 변경 시 실시간 반영됨)
  const selectedFlowEntry = useMemo(() => selectedFlowDate ? flowData.find(f => f.key === selectedFlowDate) : null, [selectedFlowDate, flowData]);

  const getBudgetStats = (groupBy: 'subcategory' | 'account') => {
      const map: Record<string, { totalInc: number; totalExp: number; count: number; months: Set<string>; currentTotal: number }> = {};
      transactions.forEach(t => {
          const key = t[groupBy]; if (!map[key]) map[key] = { totalInc: 0, totalExp: 0, count: 0, months: new Set(), currentTotal: 0 };
          const monthKey = t.date.slice(0, 7); const amt = Number(t.cost);
          if (amt > 0) map[key].totalInc += amt; else map[key].totalExp += Math.abs(amt);
          map[key].count++; map[key].months.add(monthKey);
      });
      filteredTxns.forEach(t => { const key = t[groupBy]; if (map[key]) map[key].currentTotal += Math.abs(t.cost); });
      return Object.entries(map).map(([name, data]) => {
          const monthCount = Math.max(data.months.size, 1);
          return { [groupBy]: name, avgIncome: data.totalInc / monthCount, avgExpense: data.totalExp / monthCount, totalIncome: data.totalInc, totalExpense: data.totalExp, count: data.count, monthCount, currentPeriodTotal: data.currentTotal } as AverageStat;
      }).sort((a, b) => (b.avgIncome + b.avgExpense) - (a.avgIncome + a.avgExpense));
  };

  const categoryBudgetStatsRaw = useMemo(() => getBudgetStats('subcategory'), [transactions, filteredTxns]);
  const accountBudgetStatsRaw = useMemo(() => getBudgetStats('account'), [transactions, filteredTxns]);
  const categoryBudgetStatsFiltered = useMemo(() => categoryBudgetStatsRaw.filter(s => !hiddenCategoryNames.has(s.subcategory || '')), [categoryBudgetStatsRaw, hiddenCategoryNames]);
  const accountBudgetStatsFiltered = useMemo(() => accountBudgetStatsRaw.filter(s => !hiddenAccountNames.has(s.account || '')), [accountBudgetStatsRaw, hiddenAccountNames]);

  const fixedAnalysis = useMemo(() => {
      const matchedExp = filteredTxns.filter(t => t.cost < 0 && fixedKeywords.some(k => k.category === '지출' && (t.note + t.subcategory).includes(k.keyword)));
      const matchedInc = filteredTxns.filter(t => t.cost > 0 && fixedKeywords.some(k => k.category === '수입' && (t.note + t.subcategory).includes(k.keyword)));
      return { totalFixedExp: matchedExp.reduce((acc, t) => acc + Math.abs(t.cost), 0), totalFixedInc: matchedInc.reduce((acc, t) => acc + t.cost, 0) };
  }, [filteredTxns, fixedKeywords]);

  const filteredAccountHistory = useMemo(() => {
      if (!selectedAccountForDetail) return [];
      const accountName = selectedAccountForDetail.name;
      const isHorse = HORSE_ACCOUNTS.includes(accountName);

      return transactions.filter(t => {
          const isPrimary = t.account === accountName;
          const isFrom = t.settlementFromAccount === accountName && !isHorse;
          const isTo = t.settlementToAccount === accountName && !isHorse;

          if (!isPrimary && !isFrom && !isTo) return false;
          
          if (accountHistoryFilter === 'all') return true;
          if (accountHistoryFilter === 'expense') {
              return (isPrimary && (t.category.includes('지출') || (t.category.includes('이동') && t.subcategory.includes('출금')))) || isFrom;
          }
          if (accountHistoryFilter === 'income') {
              return (isPrimary && (t.category.includes('수입') || (t.category.includes('이동') && t.subcategory.includes('입금')))) || isTo;
          }
          if (accountHistoryFilter === 'transfer') return t.category.includes('이동');
          return true;
      }).sort((a, b) => b.date.localeCompare(a.date) || b.inputTime.localeCompare(a.inputTime) || b.uniqueId.localeCompare(a.uniqueId));
  }, [selectedAccountForDetail, accountHistoryFilter, transactions]);

  // 계좌별 실시간 잔액 계산 로직 (상세 내역용 - 안정적 정렬 기반)
  const accountRunningBalances = useMemo(() => {
      if (!selectedAccountForDetail) return {};
      const accName = selectedAccountForDetail.name;
      const isHorse = HORSE_ACCOUNTS.includes(accName);

      // 전체 거래를 엄격한 시간 순으로 정렬하여 잔액 변화 추적
      const chronological = sortTransactionsChronologically(transactions)
          .filter(t => t.account === accName || (!isHorse && (t.settlementFromAccount === accName || t.settlementToAccount === accName)));

      const balances: Record<string, number> = {};
      let current = 0;
      chronological.forEach(t => {
          const abs = Math.abs(t.cost);
          // 1. 주 거래 합산
          if (t.account === accName) current += t.cost;
          
          // 2. 가상 정산 합산 (동기화 계좌가 아닐 때만 반영하여 중복 방지)
          if (!isHorse) {
            if (t.settlementFromAccount === accName) current -= abs;
            if (t.settlementToAccount === accName) current += abs;
          }
          balances[t.uniqueId] = current;
      });
      return balances;
  }, [selectedAccountForDetail, transactions]);

  // 선택된 카테고리 상세 보기용 필터링된 데이터 및 합계 계산 (기간 변경 시 실시간 반영)
  const currentCategoryDetailItems = useMemo(() => {
      if (!selectedCategoryDetail) return [];
      return filteredTxns.filter(t => {
          if (analysisTab === 'expense') return t.cost < 0 && t.category.includes('지출') && t.subcategory === selectedCategoryDetail.name;
          if (analysisTab === 'income') return t.cost > 0 && t.category.includes('수입') && t.subcategory === selectedCategoryDetail.name;
          if (analysisTab === 'transfer') return t.category.includes('이동') && t.subcategory === '이동(입금)' && t.account === selectedCategoryDetail.name;
          return false;
      });
  }, [selectedCategoryDetail, filteredTxns, analysisTab]);

  const currentCategoryDetailSum = useMemo(() => {
      return currentCategoryDetailItems.reduce((acc, t) => acc + Math.abs(t.cost), 0);
  }, [currentCategoryDetailItems]);

  const currentCategoryDetailPercentage = useMemo(() => {
      const total = analysisTab === 'expense' ? stats.expense : analysisTab === 'income' ? stats.income : stats.transfer;
      return total > 0 ? (currentCategoryDetailSum / total) * 100 : 0;
  }, [currentCategoryDetailSum, analysisTab, stats]);

  if (isLoading) return <div className="flex h-64 items-center justify-center animate-pulse text-gray-400">데이터 로딩 중...</div>;

  const currentAnalysisStats = analysisTab === 'expense' ? stats.expenseStats : analysisTab === 'income' ? stats.incomeStats : stats.transferStats;
  const currentTotalAmount = analysisTab === 'expense' ? stats.expense : analysisTab === 'income' ? stats.income : stats.transfer;
  const currentLabel = analysisTab === 'expense' ? '총 지출' : analysisTab === 'income' ? '총 수입' : '총 이동';
  const displayAnalysisStats = showAllCategories ? currentAnalysisStats : currentAnalysisStats.slice(0, 5);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col gap-3">
          <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
              <button onClick={() => setViewMode('basic')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'basic' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>기본 현황</button>
              <button onClick={() => setViewMode('detail')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'detail' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>상세 분석</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center py-1">
              {(['week', 'month', 'quarter', 'year', 'custom'] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${period === p ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}>
                      {p === 'week' ? '주간' : p === 'month' ? '월간' : p === 'quarter' ? '분기' : p === 'year' ? '연간' : '📅 직접설정'}
                  </button>
              ))}
          </div>

          {period === 'custom' && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon />
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">조회 기간 설정</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                          <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={e => setCustomStartDate(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 h-11 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20 appearance-none"
                          />
                      </div>
                      <span className="text-gray-400 font-bold">~</span>
                      <div className="flex-1 flex flex-col gap-1">
                          <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={e => setCustomEndDate(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 h-11 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20 appearance-none"
                          />
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col items-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between w-full">
                {period !== 'custom' ? (
                    <>
                        <button onClick={() => setAnchorDate(new Date(anchorDate.setMonth(anchorDate.getMonth()-1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronLeft /></button>
                        <span className="font-black text-gray-800 dark:text-white text-base">{label}</span>
                        <button onClick={() => setAnchorDate(new Date(anchorDate.setMonth(anchorDate.getMonth()+1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronRight /></button>
                    </>
                ) : (
                    <div className="flex-1 text-center">
                        <span className="font-black text-gray-800 dark:text-white text-base">선택한 기간 분석</span>
                    </div>
                )}
              </div>
              <div className="mt-1 text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {rangeText}
              </div>
          </div>
      </div>

      {/* 2. BASIC VIEW */}
      {viewMode === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-[10px] text-gray-500 mb-1">총 수입</div>
                    <div className="text-lg font-black text-green-600 dark:text-green-500">{formatCurrency(stats.income)}</div>
                </div>
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-[10px] text-gray-500 mb-1">총 지출</div>
                    <div className="text-lg font-black text-red-500">{formatCurrency(stats.expense)}</div>
                </div>
                <div className="col-span-2 bg-blue-600 dark:bg-blue-700 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg shadow-blue-500/20">
                    <span className="text-sm font-medium opacity-90">기간 내 잔액</span>
                    <span className="text-2xl font-black">{formatCurrency(stats.balance)}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">📊 내역 분석</h3>
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                        <button onClick={() => { setAnalysisTab('expense'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'expense' ? 'bg-white dark:bg-gray-800 shadow text-red-500' : 'text-gray-400'}`}>지출</button>
                        <button onClick={() => { setAnalysisTab('income'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'income' ? 'bg-white dark:bg-gray-800 shadow text-green-500' : 'text-gray-400'}`}>수입</button>
                        <button onClick={() => { setAnalysisTab('transfer'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'transfer' ? 'bg-white dark:bg-gray-800 shadow text-blue-500' : 'text-gray-400'}`}>이동</button>
                    </div>
                </div>
                <DonutChart data={currentAnalysisStats} totalAmount={currentTotalAmount} label={currentLabel} />
                <div className="mt-6 space-y-2">
                    {displayAnalysisStats.map(item => (
                        <div key={item.name} onClick={() => setSelectedCategoryDetail(item)} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold dark:text-white">{formatCurrency(item.amount)}</span>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{item.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                    {currentAnalysisStats.length > 5 && (
                        <button onClick={() => setShowAllCategories(!showAllCategories)} className="w-full text-center text-xs text-blue-500 font-medium pt-3 border-t border-gray-100 dark:border-white/5">{showAllCategories ? '접기 ▲' : `전체 항목 보기 (${currentAnalysisStats.length}개) ▼`}</button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">🏦 통장별 잔액</h3>
                    <button onClick={() => setIsManagingAccounts(true)} className="text-[11px] text-blue-500 font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-all">편집</button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                {(!initialData || initialData.bankBalances.length === 0) ? (
                    <p className="text-center text-gray-500 py-8 text-sm">데이터가 없습니다.</p>
                ) : (
                    initialData.bankBalances.map((bank) => (
                    <div key={bank.name} onClick={() => { setSelectedAccountForDetail(bank); setAccountHistoryFilter('all'); }} className="flex justify-between items-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group px-1">
                        <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white text-[15px] group-hover:text-blue-500 transition-colors truncate">{bank.name}</div>
                            <div className="text-[11px] text-gray-400 mt-1 font-medium">거래 {bank.transactionCount}건</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <div className={`font-black text-[15px] ${bank.balance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                                {formatCurrency(bank.balance)}
                            </div>
                            <span className="text-gray-300 dark:text-gray-700 font-bold text-lg leading-none">›</span>
                        </div>
                    </div>
                    ))
                )}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🕒 최근 이용 내역</h3>
                <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                    {initialData?.recentTransactions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 text-sm">내역이 없습니다.</p>
                    ) : (
                        initialData?.recentTransactions.map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)
                    )}
                </div>
            </div>
          </>
      )}

      {/* 3. DETAIL VIEW */}
      {viewMode === 'detail' && (
          <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><FlowIcon /> 흐름 분석</h3>
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                        <button onClick={() => setFlowFilter('all')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'all' ? 'bg-white dark:bg-gray-800 shadow text-blue-500 font-bold' : 'text-gray-400'}`}>전체</button>
                        <button onClick={() => setFlowFilter('income')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'income' ? 'bg-white dark:bg-gray-800 shadow text-green-500 font-bold' : 'text-gray-400'}`}>수입</button>
                        <button onClick={() => setFlowFilter('expense')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'expense' ? 'bg-white dark:bg-gray-800 shadow text-red-500 font-bold' : 'text-gray-400'}`}>지출</button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                      {flowData.map((d) => {
                          const incW = (d.income / maxFlowValue) * 100; const expW = (d.expense / maxFlowValue) * 100;
                          const showItem = flowFilter === 'all' || (flowFilter === 'income' && d.income > 0) || (flowFilter === 'expense' && d.expense > 0);
                          if (!showItem) return null;
                          return (
                              <div key={d.key} onClick={() => setSelectedFlowDate(d.key)} className="group cursor-pointer">
                                  <div className="flex justify-between items-end mb-1">
                                      <span className="text-[10px] text-gray-500 font-medium">{d.dateStr}</span>
                                      <div className="flex gap-2">
                                          {(flowFilter === 'all' || flowFilter === 'income') && d.income > 0 && <span className="text-[9px] text-green-600 font-bold">{(d.income / 10000).toFixed(1)}만</span>}
                                          {(flowFilter === 'all' || flowFilter === 'expense') && d.expense > 0 && <span className="text-[9px] text-red-600 font-bold">{(d.expense / 10000).toFixed(1)}만</span>}
                                      </div>
                                  </div>
                                  <div className="space-y-[2px]">
                                      {(flowFilter === 'all' || flowFilter === 'income') && <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-green-500/60 group-hover:bg-green-500 transition-all" style={{ width: `${incW}%` }} /></div>}
                                      {(flowFilter === 'all' || flowFilter === 'expense') && <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-red-500/60 group-hover:bg-red-500 transition-all" style={{ width: `${expW}%` }} /></div>}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FixedIcon /> 고정 내역 키워드 관리</h3>
                  <div className="flex bg-gray-100 dark:bg-white/10 rounded-xl p-1 mb-4">
                      <button onClick={() => setNewKeywordCategory('지출')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newKeywordCategory === '지출' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>지출 키워드</button>
                      <button onClick={() => setNewKeywordCategory('수입')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newKeywordCategory === '수입' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>수입 키워드</button>
                  </div>
                  <div className="flex flex-nowrap gap-2 mb-6">
                      <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="키워드 입력" className="flex-1 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none dark:text-white min-w-0" />
                      <button onClick={handleAddKeyword} disabled={isSaving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold active:scale-95 disabled:opacity-50 shrink-0 min-w-[64px]">등록</button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">고정 지출 합계</span>
                            <div className="text-lg font-black text-red-600 dark:text-red-400">{formatCurrency(fixedAnalysis.totalFixedExp)}</div>
                        </div>
                        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                            <span className="text-[10px] text-green-600 font-bold uppercase block mb-1">고정 수입 합계</span>
                            <div className="text-lg font-black text-green-600 dark:text-green-400">{formatCurrency(fixedAnalysis.totalFixedInc)}</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {fixedKeywords.map(k => (
                            <span key={k.keyword + k.category} className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border shadow-sm ${k.category === '수입' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>
                                <span className="opacity-60">{k.category === '수입' ? '💰' : '💸'}</span>{k.keyword}<button onClick={() => handleRemoveKeyword(k.keyword)} className="text-[10px] opacity-40 hover:opacity-100">✕</button>
                            </span>
                        ))}
                    </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><ChartIcon /> 카테고리별 예산 지표</h3>
                    <button onClick={() => setIsEditingCategoryVisibility(true)} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                      {categoryBudgetStatsFiltered.slice(0, 10).map(avg => (
                          <div key={avg.subcategory} onClick={() => setSelectedAvgDetail(avg)} className="py-4 px-1 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2"><span className="text-sm font-bold dark:text-white group-hover:text-blue-500">{avg.subcategory}</span><span className="text-[9px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{avg.monthCount}개월 평균</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 수입</div><div className="text-xs font-bold text-green-600">+{formatCurrency(avg.avgIncome)}</div></div>
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 지출</div><div className="text-xs font-bold text-red-500">-{formatCurrency(avg.avgExpense)}</div></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><WalletIcon /> 통장별 예산 지표</h3>
                    <button onClick={() => setIsEditingAccountVisibility(true)} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                      {accountBudgetStatsFiltered.slice(0, 10).map(avg => (
                          <div key={avg.account} onClick={() => setSelectedAvgDetail(avg)} className="py-4 px-1 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2"><span className="text-sm font-bold dark:text-white group-hover:text-blue-500">{avg.account}</span><span className="text-[9px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{avg.monthCount}개월 평균</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 입금</div><div className="text-xs font-bold text-green-600">+{formatCurrency(avg.avgIncome)}</div></div>
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 출금</div><div className="text-xs font-bold text-red-500">-{formatCurrency(avg.avgExpense)}</div></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- BOTTOM SHEETS --- */}
      {selectedAccountForDetail && (
          <BottomSheetWrapper onClose={() => setSelectedAccountForDetail(null)} title={selectedAccountForDetail.name} subtitle="통장 상세" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                  <div className="space-y-0.5"><div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">현재 잔액</div><div className="text-xl font-black dark:text-white">{formatCurrency(selectedAccountForDetail.balance)}</div></div>
                  <div className="text-right"><div className="text-[10px] text-gray-400 font-bold uppercase">전체 {filteredAccountHistory.length}건</div></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-0.5 no-scrollbar bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {filteredAccountHistory.map((t) => (
                    <TransactionCard 
                        key={t.uniqueId} 
                        t={t} 
                        noBg 
                        contextAccount={selectedAccountForDetail.name} 
                        runningBalance={accountRunningBalances[t.uniqueId]} 
                    />
                  ))}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedFlowDate && (
          <BottomSheetWrapper onClose={() => setSelectedFlowDate(null)} title={selectedFlowDate} subtitle="날짜별 상세" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                  <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20 text-center flex-1 mr-1.5">
                      <div className="text-[9px] text-green-600 dark:text-green-500 font-bold uppercase">수입 합계</div>
                      <div className="text-base font-black text-green-600 dark:text-green-500">{formatCurrency(selectedFlowEntry?.income || 0)}</div>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 text-center flex-1 ml-1.5">
                      <div className="text-[9px] text-red-500 dark:text-red-400 font-bold uppercase">지출 합계</div>
                      <div className="text-base font-black text-red-600 dark:text-red-400">{formatCurrency(selectedFlowEntry?.expense || 0)}</div>
                  </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {filteredTxns.filter(t => (period === 'year' || period === 'quarter' || (period === 'custom' && flowData.length > 62)) ? t.date.startsWith(selectedFlowDate.replace('월','').padStart(2,'0')) : t.date === (selectedFlowDate.includes('일') ? startDate.toISOString().split('T')[0].slice(0, 8) + selectedFlowDate.replace('일','').padStart(2,'0') : selectedFlowDate)).map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedAvgDetail && (
          <BottomSheetWrapper onClose={() => setSelectedAvgDetail(null)} title={selectedAvgDetail.subcategory || selectedAvgDetail.account || ''} subtitle="평균 데이터 분석" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 border-b border-gray-100 dark:border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-end min-h-[64px]">
                          <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">월 평균 지출/출금</div>
                          <div className="text-sm text-red-500 font-black">{formatCurrency(selectedAvgDetail.avgExpense)}</div>
                      </div>
                      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-end min-h-[64px]">
                          <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">누적 총 수입/입금</div>
                          <div className="text-sm dark:text-white font-black">{formatCurrency(selectedAvgDetail.totalIncome)}</div>
                      </div>
                  </div>
                  <div className="pt-3 flex justify-between items-center px-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">분석 기간: {selectedAvgDetail.monthCount}개월</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">누적 {selectedAvgDetail.count}건 거래</span>
                  </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {transactions.filter(t => (selectedAvgDetail.subcategory ? t.subcategory === selectedAvgDetail.subcategory : t.account === selectedAvgDetail.account)).slice(0, 50).map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedCategoryDetail && (
          <BottomSheetWrapper onClose={() => setSelectedCategoryDetail(null)} title={selectedCategoryDetail.name} subtitle={`${label} 상세 분석`} headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                   <div className="space-y-0.5">
                       <div className="text-[10px] text-gray-500 font-bold uppercase">선택 기간 합계</div>
                       <div className={`text-xl font-black ${analysisTab === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                           {formatCurrency(currentCategoryDetailSum)}
                       </div>
                   </div>
                   <div className="text-right">
                       <div className="text-[10px] text-gray-500 font-bold uppercase">점유 비중</div>
                       <div className="text-lg font-black dark:text-white leading-none">{currentCategoryDetailPercentage.toFixed(1)}%</div>
                   </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {currentCategoryDetailItems.map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {/* Centered Modals */}
      {isManagingAccounts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsManagingAccounts(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">대시보드 노출 계좌</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {allAccounts.map(acc => (
                          <label key={acc} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{acc}</span>
                              <input type="checkbox" checked={tempManagedAccounts.has(acc)} onChange={() => { const next = new Set(tempManagedAccounts); if (next.has(acc)) next.delete(acc); else next.add(acc); setTempManagedAccounts(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={handleSaveManagedAccounts} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">저장</button></div>
              </div>
          </div>
      )}

      {isEditingCategoryVisibility && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsEditingCategoryVisibility(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">카테고리 표시 관리</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {categoryBudgetStatsRaw.map(s => (
                          <label key={s.subcategory} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{s.subcategory}</span>
                              <input type="checkbox" checked={!hiddenCategoryNames.has(s.subcategory || '')} onChange={() => { const next = new Set(hiddenCategoryNames); if (next.has(s.subcategory || '')) next.delete(s.subcategory || ''); else next.add(s.subcategory || ''); setHiddenCategoryNames(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={() => handleSaveVisibility('category')} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">완료</button></div>
              </div>
          </div>
      )}

      {isEditingAccountVisibility && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsEditingAccountVisibility(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">통장 표시 관리</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {accountBudgetStatsRaw.map(s => (
                          <label key={s.account} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{s.account}</span>
                              <input type="checkbox" checked={!hiddenAccountNames.has(s.account || '')} onChange={() => { const next = new Set(hiddenAccountNames); if (next.has(s.account || '')) next.delete(s.account || ''); else next.add(s.account || ''); setHiddenAccountNames(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={() => handleSaveVisibility('account')} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">완료</button></div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
