import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeTransactions, deleteTransaction, subscribeSubCategories } from '../services/transactionService';
import { Transaction, SubCategory } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
  Plus, Paperclip, Search, Filter, Trash2, Edit2, ArrowUpRight, ArrowDownLeft, 
  FileDown, X, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ArrowRightLeft, Scale, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TransactionModal from '../components/TransactionModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameDay, 
  startOfMonth, 
  startOfQuarter,
  endOfMonth, 
  eachDayOfInterval, 
  isToday,
  parseISO,
  isWithinInterval,
  endOfWeek,
  subMonths,
  addMonths
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface FilterState {
  types: string[];
  settlementStatuses: string[];
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    settlementStatuses: []
  });
  const [activeFilterType, setActiveFilterType] = useState<'type' | 'status' | 'custom' | null>(null);

  // Date Filtering State
  const today = new Date();
  const [isMonthlyView, setIsMonthlyView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentViewDate, setCurrentViewDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(today); // Kept for month-specific view logic if needed, but will sync with currentViewDate

  // Generate date grids
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentViewDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentViewDate]);
  
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentViewDate);
    const end = endOfMonth(currentViewDate);
    const calStart = startOfWeek(start, { weekStartsOn: 0 });
    const calEnd = endOfWeek(end, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentViewDate]);

  const handlePrev = () => {
    if (isMonthlyView) {
      setCurrentViewDate(prev => subMonths(prev, 1));
    } else {
      setCurrentViewDate(prev => addDays(prev, -7));
    }
  };

  const handleNext = () => {
    if (isMonthlyView) {
      setCurrentViewDate(prev => addMonths(prev, 1));
    } else {
      setCurrentViewDate(prev => addDays(prev, 7));
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    
    const unsubscribeSubs = subscribeSubCategories(user.uid, (data) => {
      setAvailableSubCategories(data);
    });

    return () => {
      unsubscribe();
      unsubscribeSubs();
    };
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      
      // Date Matching
      let matchesDate = false;
      if (dateRange) {
        matchesDate = isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end });
      } else {
        matchesDate = isSameDay(tDate, selectedDate);
      }

      // Search Term Matching
      const searchStr = `${t.memo} ${t.subCategory || ''} ${t.paymentMethod}`.toLowerCase();
      const matchesSearch = searchTerm === '' || searchStr.includes(searchTerm.toLowerCase());

      // Transaction Type Filter
      const matchesType = filters.types.length === 0 || filters.types.includes(t.type);

      // Settlement Status Filter
      const matchesStatus = filters.settlementStatuses.length === 0 || 
        (filters.settlementStatuses.includes(t.settlementStatus || 'N/A'));

      return matchesDate && matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchTerm, filters, selectedDate, dateRange]);

  const dailySummaries = useMemo(() => {
    const summaries: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const dateKey = format(parseISO(t.date), 'yyyy-MM-dd');
      if (!summaries[dateKey]) summaries[dateKey] = { income: 0, expense: 0 };
      if (t.type === 'income') summaries[dateKey].income += t.amount;
      else if (t.type === 'expense') summaries[dateKey].expense += t.amount;
    });
    return summaries;
  }, [transactions]);

  const settlementOptions = ['대기', '완료', '보류', 'N/A'];

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[type];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
  };

  const clearFilters = () => {
    setFilters({ types: [], settlementStatuses: [] });
    setSearchTerm('');
  };

  const handleDownloadExcel = () => {
    if (transactions.length === 0) return;

    const data = transactions.map(t => ({
      '입력시간': formatDate(t.createdAt || t.date),
      '카테고리': t.category,
      '세부 카테고리': t.subCategory || '',
      '비용': t.amount,
      '통장/카드': t.paymentMethod,
      '세부정보': t.memo,
      '실행일': formatDate(t.date),
      '정산 상태': t.settlementStatus || '',
      '🐴🐭': t.marker ? 'O' : 'X',
      '신행 세부카테고리': t.newSubCategory || '',
      '업로드 사진 링크': [t.photoUrl || '', ...(t.photoUrls || [])].filter(Boolean).join(', '),
      '고유ID': t.id,
      '이동ID': t.transferId || '',
      '정산한통장': t.settledFromAccount || '',
      '정산받은통장': t.settledToAccount || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // 컬럼 너비 조정 (15개 컬럼)
    const wscols = Array(15).fill({ wch: 15 });
    wscols[1] = { wch: 15 }; // 카테고리
    wscols[2] = { wch: 15 }; // 세부 카테고리
    wscols[5] = { wch: 30 }; // 세부정보
    wscols[10] = { wch: 20 }; // 사진 링크
    wscols[11] = { wch: 20 }; // 고유ID
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `MoMoney_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteTransaction(user.uid, id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)] pb-24">
      {/* Expandable Calendar Section */}
      <div className="mb-10 overflow-hidden px-1">
        {/* Month Navigator Row */}
        <div className="flex items-center justify-center py-2 mb-2">
          <div className="flex items-center gap-6">
            <button 
              onClick={handlePrev}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm sm:text-base font-display font-bold text-[#5C544E] min-w-[120px] text-center">
              {format(currentViewDate, 'yyyy년 M월', { locale: ko })}
            </span>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex flex-1 items-center gap-1 bg-gray-100/50 p-1 rounded-2xl">
            <button 
              onClick={() => setIsMonthlyView(true)}
              className={cn(
                "flex-1 text-[10px] sm:text-[11px] font-bold py-2 px-3 rounded-xl transition-all",
                isMonthlyView ? "bg-white text-[#8B9178] shadow-sm" : "text-gray-400 hover:text-[#5C544E]"
              )}
            >
              월간
            </button>
            <button 
              onClick={() => setIsMonthlyView(false)}
              className={cn(
                "flex-1 text-[10px] sm:text-[11px] font-bold py-2 px-3 rounded-xl transition-all",
                !isMonthlyView ? "bg-white text-[#8B9178] shadow-sm" : "text-gray-400 hover:text-[#5C544E]"
              )}
            >
              주간
            </button>
          </div>
          <button 
            onClick={() => setActiveFilterType('custom')}
            className={cn(
              "flex-[0.8] text-[10px] sm:text-[11px] font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2",
              dateRange ? "bg-[#8B9178] text-white shadow-md" : "bg-white text-[#5C544E] border border-[#EAE7E0] hover:border-[#D9D4C7]"
            )}
          >
            <span>기간 설정</span>
            {dateRange && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
          </button>
        </div>

        <motion.div 
          animate={{ height: 'auto' }}
          className="pb-4 mt-4"
        >
          <div className="grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-gray-300 uppercase py-2">{d}</div>
            ))}
            {(isMonthlyView ? monthDays : weekDays).map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const summary = dailySummaries[dateKey];
              const isSel = isSameDay(day, selectedDate) && !dateRange;
              const isTod = isToday(day);
              const isOtherMonth = isMonthlyView && day.getMonth() !== viewMonth.getMonth();
              
              // Range Highlighting Logic
              const isInRange = dateRange && isWithinInterval(day, { start: dateRange.start, end: dateRange.end });
              const isRangeStart = dateRange && isSameDay(day, dateRange.start);
              const isRangeEnd = dateRange && isSameDay(day, dateRange.end);

              const formatVal = (val: number, type: 'income' | 'expense') => {
                const prefix = type === 'income' ? '+' : '-';
                if (val >= 10000) return `${prefix}${(val / 10000).toFixed(1)}만`;
                if (val >= 1000) return `${prefix}${(val / 1000).toFixed(1)}천`;
                return `${prefix}${val.toLocaleString()}`;
              };

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedDate(day);
                    setDateRange(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-between p-1.5 rounded-xl transition-all aspect-square relative",
                    isOtherMonth ? "opacity-10 pointer-events-none" : "hover:bg-gray-50",
                    isSel 
                      ? "bg-[#8B9178] text-white shadow-lg z-20 scale-105" 
                      : isInRange
                        ? "bg-[#8B9178]/10 text-[#5C544E] z-0"
                        : "bg-transparent text-[#5C544E]",
                    isRangeStart && "rounded-l-2xl bg-[#8B9178] text-white z-10",
                    isRangeEnd && "rounded-r-2xl bg-[#8B9178] text-white z-10",
                    isInRange && !isRangeStart && !isRangeEnd && "rounded-none",
                    isTod && !isSel && !isRangeStart && !isRangeEnd && "text-[#8B9178] ring-1 ring-[#8B9178]/20"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-bold z-10",
                    (isSel || isRangeStart || isRangeEnd) ? "text-white" : ""
                  )}>{format(day, 'd')}</span>
                  <div className="w-full text-[7px] font-bold space-y-0.5 mt-auto overflow-hidden z-10">
                    {summary?.income > 0 && (
                      <div className={cn("truncate text-emerald-500", (isSel || isRangeStart || isRangeEnd) ? "text-emerald-100" : "")}>
                        {formatVal(summary.income, 'income')}
                      </div>
                    )}
                    {summary?.expense > 0 && (
                      <div className={cn("truncate text-[#A67C52]", (isSel || isRangeStart || isRangeEnd) ? "text-[#E6D5C5]" : "")}>
                        {formatVal(summary.expense, 'expense')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Search and Filters Section */}
      <div className="mb-8 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8B9178] transition-colors" />
          <input 
            type="text" 
            placeholder="내용, 카테고리, 결제수단 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#EAE7E0] hover:border-[#D9D4C7] focus:border-[#8B9178] focus:ring-0 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#5C544E] shadow-sm transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-[#5C544E] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button 
            onClick={() => setActiveFilterType('type')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap border",
              filters.types.length > 0
                ? "bg-[#8B9178] text-white border-[#8B9178] shadow-md"
                : "bg-white text-[#5C544E] border-[#EAE7E0] hover:border-[#D9D4C7]"
            )}
          >
            <Filter className="w-3 h-3" />
            <span>거래 타입 {filters.types.length > 0 && `(${filters.types.length})`}</span>
          </button>

          <button 
            onClick={() => setActiveFilterType('status')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap border",
              filters.settlementStatuses.length > 0
                ? "bg-[#A67C52] text-white border-[#A67C52] shadow-md"
                : "bg-white text-[#5C544E] border-[#EAE7E0] hover:border-[#D9D4C7]"
            )}
          >
            <Filter className="w-3 h-3" />
            <span>정산 상태 {filters.settlementStatuses.length > 0 && `(${filters.settlementStatuses.length})`}</span>
          </button>
        </div>
      </div>

      {/* Transaction List - Box removed for cleaner data density */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE7E0]">
          <h2 className="font-display font-bold text-lg text-[#5C544E]">
            {dateRange 
              ? `${format(dateRange.start, 'MM.dd')} - ${format(dateRange.end, 'MM.dd')} 내역` 
              : `${format(selectedDate, 'M월 d일')} 내역`}
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadExcel}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D9D4C7] rounded-lg text-[10px] font-bold text-[#5C544E] hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5 text-[#8B9178]" />
              <span>EXCEL 추출</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#5C544E]">
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">일자</th>
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">세부 분류</th>
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">내용</th>
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right border-b border-gray-100">금액</th>
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">통장/카드</th>
                <th className="px-4 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right border-b border-gray-100">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 font-medium">내역을 불러오는 중...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 font-medium">검색 결과가 없습니다. 다시 검색해보세요!</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white transition-all group">
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#5C544E] font-bold">{formatDate(t.date)}</span>
                        <span className={cn(
                          "text-[9px] font-bold uppercase",
                          t.settlementStatus === '완료' ? "text-emerald-500" : "text-amber-500"
                        )}>{t.settlementStatus || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="px-3 py-1.5 bg-[#F2EFE9] text-[#5C544E] rounded-md text-[10px] font-bold uppercase tracking-tight">
                        {t.subCategory || '분류없음'}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[#3D3D3D] font-bold text-sm">{t.memo}</span>
                        {((t.photoUrls && t.photoUrls.length > 0) || t.photoUrl) && (
                          <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "px-4 py-5 whitespace-nowrap text-right font-display font-bold text-sm",
                      t.type === 'income' ? 'text-emerald-600' : 
                      t.type === 'expense' ? 'text-[#A67C52]' :
                      t.type === 'balance_adj' ? 'text-blue-600' : 'text-amber-600'
                    )}>
                      {t.type === 'income' ? '₩' : t.type === 'expense' ? '-₩' : ''}{t.amount.toLocaleString()}
                      {t.type === 'balance_adj' && <span className="text-[9px] ml-1 opacity-50">(정정)</span>}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {t.type === 'transfer' ? (
                        <div className="flex items-center gap-1">
                          <span>{t.paymentMethod}</span>
                          <ChevronRight className="w-2 h-2" />
                          <span>{t.settledToAccount}</span>
                        </div>
                      ) : t.paymentMethod}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2 hover:bg-[#D9D4C7] rounded-lg text-[#5C544E] transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 hover:bg-rose-100 rounded-lg text-rose-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="sm:hidden divide-y divide-gray-100 uppercase tracking-tighter">
          {loading ? (
             <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">불러오는 중...</div>
          ) : filteredTransactions.length === 0 ? (
             <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">검색 결과가 없습니다.</div>
          ) : (
            filteredTransactions.map((t) => {
              const TypeIcon = t.type === 'income' ? ArrowUpRight : 
                              t.type === 'expense' ? ArrowDownLeft :
                              t.type === 'balance_adj' ? Scale : ArrowRightLeft;
              const typeColor = t.type === 'income' ? "bg-emerald-50 text-emerald-600" : 
                               t.type === 'expense' ? "bg-rose-50 text-rose-600" :
                               t.type === 'balance_adj' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600";
              const amountColor = t.type === 'income' ? 'text-emerald-600' : 
                                 t.type === 'expense' ? 'text-[#A67C52]' :
                                 t.type === 'balance_adj' ? 'text-blue-600' : 'text-amber-600';

              return (
                <div key={t.id} className="py-5 flex items-center justify-between active:bg-gray-50 transition-colors" onClick={() => handleEdit(t)}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm", typeColor)}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-[#3D3D3D] truncate">{t.memo}</span>
                        {((t.photoUrls && t.photoUrls.length > 0) || t.photoUrl) && (
                          <ImageIcon className="w-3 h-3 text-gray-300 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-normal">{formatDate(t.date).slice(5)}</span>
                         <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                         <span className="text-[10px] font-bold text-[#8B9178] uppercase">{t.subCategory || '분류없음'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-display font-bold", amountColor)}>
                      {t.type === 'income' ? '₩' : t.type === 'expense' ? '-₩' : ''}{t.amount.toLocaleString()}
                      {t.type === 'balance_adj' && <span className="text-[9px] ml-1 opacity-50">(정정)</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {t.type === 'transfer' ? `${t.paymentMethod} → ${t.settledToAccount}` : t.paymentMethod}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingTransaction={editingTransaction}
      />

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditingTransaction(undefined);
          setIsModalOpen(true);
        }}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#8B9178] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#8B9178]/40 hover:bg-[#6B705C] hover:scale-110 active:scale-95 transition-all z-40 group"
        aria-label="Add Transaction"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Filter Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {activeFilterType && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveFilterType(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] z-[60] shadow-2xl border-t border-[#EAE7E0] max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#F9F7F2] flex items-center justify-between bg-[#FDFCF8]">
                <div>
                  <h3 className="text-lg font-display font-bold text-[#5C544E]">
                    {activeFilterType === 'type' ? '거래 타입 필터' : 
                     activeFilterType === 'status' ? '정산 상태 필터' : '기간 설정 및 범위조회'}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {activeFilterType === 'custom' ? '조회하려는 시작일과 종료일을 지정하세요' : '다중 선택이 가능합니다'}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveFilterType(null)}
                  className="w-10 h-10 rounded-full bg-white border border-[#EAE7E0] flex items-center justify-center text-gray-400 hover:text-[#5C544E] transition-colors shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                {activeFilterType === 'custom' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">시작일</label>
                        <input 
                          type="date" 
                          value={dateRange?.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                          className="w-full bg-[#F9F7F2] border-[#EAE7E0] rounded-xl p-3 text-xs font-bold"
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : today;
                            setDateRange(prev => ({ start: date, end: prev?.end || today }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">종료일</label>
                        <input 
                          type="date" 
                          value={dateRange?.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                          className="w-full bg-[#F9F7F2] border-[#EAE7E0] rounded-xl p-3 text-xs font-bold"
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : today;
                            setDateRange(prev => ({ start: prev?.start || today, end: date }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">빠른 기간 선택</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button 
                          onClick={() => {
                            setDateRange(null);
                            setSelectedDate(today);
                            setActiveFilterType(null);
                          }}
                          className="p-3 bg-[#F9F7F2] rounded-xl border border-[#EAE7E0] text-[10px] font-bold text-[#5C544E] hover:bg-[#8B9178] hover:text-white transition-all text-center"
                        >
                          전체
                        </button>
                        <button 
                          onClick={() => {
                            setDateRange({ start: startOfQuarter(today), end: today });
                            setActiveFilterType(null);
                          }}
                          className="p-3 bg-[#F9F7F2] rounded-xl border border-[#EAE7E0] text-[10px] font-bold text-[#5C544E] hover:bg-[#8B9178] hover:text-white transition-all text-center"
                        >
                          이번 분기
                        </button>
                        <button 
                          onClick={() => {
                            setDateRange({ start: startOfMonth(today), end: today });
                            setActiveFilterType(null);
                          }}
                          className="p-3 bg-[#F9F7F2] rounded-xl border border-[#EAE7E0] text-[10px] font-bold text-[#5C544E] hover:bg-[#8B9178] hover:text-white transition-all text-center"
                        >
                          이번 달
                        </button>
                        <button 
                          onClick={() => {
                            setDateRange({ start: startOfWeek(today, { weekStartsOn: 0 }), end: today });
                            setActiveFilterType(null);
                          }}
                          className="p-3 bg-[#F9F7F2] rounded-xl border border-[#EAE7E0] text-[10px] font-bold text-[#5C544E] hover:bg-[#8B9178] hover:text-white transition-all text-center"
                        >
                          이번 주
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeFilterType === 'type' ? (
                      <>
                        {[
                          { label: '전체', value: 'all' },
                          { label: '수입', value: 'income' },
                          { label: '지출', value: 'expense' },
                          { label: '이동', value: 'transfer' }
                        ].map((item) => {
                          const isSelected = item.value === 'all' 
                            ? filters.types.length === 0 
                            : filters.types.includes(item.value);
                          
                          return (
                            <button
                              key={item.value}
                              onClick={() => {
                                if (item.value === 'all') {
                                  setFilters(prev => ({ ...prev, types: [] }));
                                } else {
                                  toggleFilter('types', item.value);
                                }
                              }}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                isSelected 
                                  ? "bg-[#8B9178]/5 border-[#8B9178] text-[#8B9178]" 
                                  : "bg-white border-[#EAE7E0] text-[#5C544E] hover:border-[#D9D4C7]"
                              )}
                            >
                              <span className="text-sm font-bold">{item.label}</span>
                              {isSelected && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, settlementStatuses: [] }))}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                            filters.settlementStatuses.length === 0 
                              ? "bg-[#A67C52]/5 border-[#A67C52] text-[#A67C52]" 
                              : "bg-white border-[#EAE7E0] text-[#5C544E] hover:border-[#D9D4C7]"
                          )}
                        >
                          <span className="text-sm font-bold">전체</span>
                          {filters.settlementStatuses.length === 0 && <Check className="w-4 h-4" />}
                        </button>
                        {settlementOptions.map(option => {
                          const isSelected = filters.settlementStatuses.includes(option);
                          return (
                            <button
                              key={option}
                              onClick={() => toggleFilter('settlementStatuses', option)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                isSelected 
                                  ? "bg-[#A67C52]/5 border-[#A67C52] text-[#A67C52]" 
                                  : "bg-white border-[#EAE7E0] text-[#5C544E] hover:border-[#D9D4C7]"
                              )}
                            >
                              <span className="text-sm font-bold">{option}</span>
                              {isSelected && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-[#F9F7F2]">
                <button 
                  onClick={() => setActiveFilterType(null)}
                  className="w-full py-4 bg-[#5C544E] text-white rounded-2xl font-bold hover:bg-[#3D3D3D] transition-all shadow-lg shadow-[#5C544E]/20"
                >
                  필터 적용하기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
