import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { subscribeTransactions, deleteTransaction, subscribeSubCategories } from '../services/transactionService';
import { Transaction, SubCategory } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
  Plus, Paperclip, Search, Filter, Trash2, Edit2, ArrowUpRight, ArrowDownLeft, 
  FileDown, X, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
  ArrowRightLeft, Scale, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TransactionModal from '../components/TransactionModal';
import { motion, AnimatePresence } from 'motion/react';
import PeriodSelector, { getRangeFromPeriod, PeriodType } from '../components/PeriodSelector';
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

import DateNavHeader from '../components/DateNavHeader';

export default function Transactions() {
  const { user } = useAuth();
  const { currentLedger } = useLedgers();
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

  // Period Selector Support
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const handleSelectedDateChange = (day: Date) => {
    setSelectedDate(day);
    setDateRange(null);
    setPeriod('today');
  };

  const handleViewDateChange = (newDate: Date) => {
    setCurrentViewDate(newDate);
    if (isMonthlyView) {
      setPeriod('custom');
      const start = startOfMonth(newDate);
      const end = endOfMonth(newDate);
      setCustomRange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      });
      setDateRange({ start, end });
    } else {
      // Weekly view sync
      setPeriod('custom');
      const start = startOfWeek(newDate, { weekStartsOn: 0 });
      const end = endOfWeek(newDate, { weekStartsOn: 0 });
      setCustomRange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      });
      setDateRange({ start, end });
    }
  };

  useEffect(() => {
    if (!user || !currentLedger) {
      setTransactions([]);
      setAvailableSubCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTransactions(currentLedger.id, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    
    const unsubscribeSubs = subscribeSubCategories(currentLedger.id, (data) => {
      setAvailableSubCategories(data);
    });

    return () => {
      unsubscribe();
      unsubscribeSubs();
    };
  }, [user, currentLedger?.id]);

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

    XLSX.writeFile(workbook, `GULBZZUS_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!user || !currentLedger) return;
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteTransaction(currentLedger.id, id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)] pb-24">
      <DateNavHeader 
        currentViewDate={currentViewDate}
        onViewDateChange={handleViewDateChange}
        isMonthlyView={isMonthlyView}
        setIsMonthlyView={setIsMonthlyView}
        selectedDate={selectedDate}
        onSelectedDateChange={handleSelectedDateChange}
        dateRange={dateRange}
        onPeriodClick={() => setActiveFilterType('custom')}
        dailySummaries={dailySummaries}
      />

      {/* Control Tools Section */}
      <div className="mb-8 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] group-focus-within:text-[#007AFF] transition-colors" />
          <input 
            type="text" 
            placeholder="기록 검색 및 필터링..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-[#F2F2F7] border-transparent focus:bg-white focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] rounded-2xl pl-12 pr-4 text-sm font-medium text-[#1D1D1F] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 px-0.5 scrollbar-none">
          <button 
            id="filter-type-button"
            onClick={() => setActiveFilterType('type')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-[1rem] text-xs font-semibold transition-all whitespace-nowrap border",
              filters.types.length > 0
                ? "bg-[#007AFF] text-white border-transparent"
                : "bg-white text-[#1D1D1F] border-[#F2F2F7] hover:border-gray-200 shadow-sm"
            )}
          >
            <span>거래 타입 {filters.types.length > 0 && `(${filters.types.length})`}</span>
            <ChevronDown className={cn("w-3.5 h-3.5", filters.types.length > 0 ? "text-white/80" : "text-[#86868B]")} />
          </button>

          <button 
            id="filter-status-button"
            onClick={() => setActiveFilterType('status')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-[1rem] text-xs font-semibold transition-all whitespace-nowrap border",
              filters.settlementStatuses.length > 0
                ? "bg-[#5856D6] text-white border-transparent"
                : "bg-white text-[#1D1D1F] border-[#F2F2F7] hover:border-gray-200 shadow-sm"
            )}
          >
            <span>정산 상태 {filters.settlementStatuses.length > 0 && `(${filters.settlementStatuses.length})`}</span>
            <ChevronDown className={cn("w-3.5 h-3.5", filters.settlementStatuses.length > 0 ? "text-white/80" : "text-[#86868B]")} />
          </button>

          {(filters.types.length > 0 || filters.settlementStatuses.length > 0 || searchTerm !== '') && (
            <button 
              onClick={clearFilters}
              className="h-10 px-4 text-xs font-semibold text-[#FF3B30] hover:bg-red-50 rounded-full transition-all"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#F2F2F7]">
          <h2 className="font-bold text-lg text-[#1D1D1F]">
            {dateRange 
              ? `${format(dateRange.start, 'MM.dd')} - ${format(dateRange.end, 'MM.dd')}` 
              : `${format(selectedDate, 'M월 d일')} 내역`}
          </h2>
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>

        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#86868B]">
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest border-b border-[#F2F2F7]">날짜/정산</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest border-b border-[#F2F2F7]">분류</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest border-b border-[#F2F2F7]">내용</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-right border-b border-[#F2F2F7]">금액</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest border-b border-[#F2F2F7]">방법</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-right border-b border-[#F2F2F7]">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-[#86868B] font-medium italic">불러오는 중...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-[#86868B] font-medium italic">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F5F5F7] transition-all group">
                    <td className="px-4 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#1D1D1F] font-semibold">{formatDate(t.date)}</span>
                        <span className={cn(
                          "text-[10px] font-bold",
                          t.settlementStatus === '완료' ? "text-[#34C759]" : "text-[#FF9500]"
                        )}>{t.settlementStatus || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="px-2.5 py-1 bg-[#F2F2F7] text-[#1D1D1F] rounded-lg text-[10px] font-semibold">
                        {t.subCategory || '분분류없음'}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1D1D1F] font-semibold text-sm">{t.memo}</span>
                        {((t.photoUrls && t.photoUrls.length > 0) || t.photoUrl) && (
                          <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "px-4 py-5 text-right font-bold text-sm",
                      t.type === 'income' ? 'text-[#34C759]' : 
                      t.type === 'expense' ? 'text-[#FF3B30]' :
                      t.type === 'balance_adj' ? 'text-[#007AFF]' : 'text-[#FF9500]'
                    )}>
                      {t.type === 'income' ? '₩' : t.type === 'expense' ? '-₩' : ''}{t.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-5 text-[10px] text-[#86868B] font-semibold">
                      {t.type === 'transfer' ? (
                        <div className="flex items-center gap-1">
                          <span>{t.paymentMethod}</span>
                          <ChevronRight className="w-2 h-2" />
                          <span>{t.settledToAccount}</span>
                        </div>
                      ) : t.paymentMethod}
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-[#1D1D1F] transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-[#FF3B30] transition-all"
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

        {/* Mobile Minimal List View */}
        <div className="sm:hidden space-y-1">
          {loading ? (
             <div className="p-10 text-center text-[#86868B] text-xs font-semibold italic">불러오는 중...</div>
          ) : filteredTransactions.length === 0 ? (
             <div className="p-10 text-center text-[#86868B] text-xs font-semibold italic">검색 결과가 없습니다.</div>
          ) : (
            filteredTransactions.map((t) => {
              const amountColor = t.type === 'income' ? 'text-[#34C759]' : 
                                 t.type === 'expense' ? 'text-[#FF3B30]' :
                                 t.type === 'balance_adj' ? 'text-[#007AFF]' : 'text-[#FF9500]';

              return (
                <div key={t.id} className="py-4 flex items-center justify-between active:bg-[#F2F2F7] transition-colors rounded-2xl px-2" onClick={() => handleEdit(t)}>
                  <div className="flex flex-col min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-[#1D1D1F] truncate">{t.memo}</span>
                      {((t.photoUrls && t.photoUrls.length > 0) || t.photoUrl) && (
                        <ImageIcon className="w-3 h-3 text-gray-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-bold text-[#007AFF]">{t.subCategory || '분류없음'}</span>
                       <span className="w-0.5 h-0.5 bg-gray-300 rounded-full"></span>
                       <span className="text-[10px] text-[#86868B] font-medium">{t.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-base font-bold tracking-tight", amountColor)}>
                      {t.type === 'income' ? '₩' : t.type === 'expense' ? '-₩' : ''}{t.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-[#86868B] font-bold uppercase tracking-wider">{formatDate(t.date).slice(5)}</p>
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
      <AnimatePresence>
        {!isModalOpen && !activeFilterType && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => {
              setEditingTransaction(undefined);
              setIsModalOpen(true);
            }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-[#007AFF] text-white rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,122,255,0.3)] hover:scale-110 active:scale-95 transition-all z-[30] group"
            aria-label="Add Transaction"
          >
            <Plus className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Filter Bottom Sheet */}
      <AnimatePresence>
        {activeFilterType && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveFilterType(null)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="w-full flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>

              <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">
                    {activeFilterType === 'type' ? '거래 타입' : 
                     activeFilterType === 'status' ? '정산 상태' : '조회 기간 설정'}
                  </h3>
                  <p className="text-[11px] font-medium text-[#86868B] mt-0.5">
                    {activeFilterType === 'custom' ? '조회하려는 범위를 선택하세요' : '조건을 선택하여 필터링합니다'}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveFilterType(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                {activeFilterType === 'custom' ? (
                  <PeriodSelector 
                    period={period}
                    onChangePeriod={(p) => {
                      setPeriod(p);
                      const range = getRangeFromPeriod(p, {
                        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                      });
                      if (p === 'today') {
                        setDateRange(null);
                        setSelectedDate(new Date());
                      } else {
                        setDateRange(range);
                      }
                      if (p !== 'custom') {
                        setActiveFilterType(null);
                      }
                    }}
                    customRange={customRange}
                    onChangeCustomRange={(range) => {
                      setCustomRange(range);
                      setDateRange(getRangeFromPeriod('custom', range));
                    }}
                    variant="sheet"
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeFilterType === 'type' ? (
                      [
                        { label: '전체', value: 'all' },
                        { label: '수입 (+)', value: 'income' },
                        { label: '지출 (-)', value: 'expense' },
                        { label: '이동 (⇄)', value: 'transfer' }
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
                              "flex items-center justify-between p-4 rounded-2xl border transition-all h-16",
                              isSelected 
                                ? "bg-blue-50 border-blue-100 text-[#007AFF]" 
                                : "bg-[#F5F5F7] border-transparent text-[#1D1D1F] hover:bg-[#E8E8ED]"
                            )}
                          >
                            <span className="text-sm font-semibold">{item.label}</span>
                            {isSelected && <Check className="w-5 h-5" />}
                          </button>
                        );
                      })
                    ) : (
                      <>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, settlementStatuses: [] }))}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all h-16",
                            filters.settlementStatuses.length === 0 
                              ? "bg-blue-50 border-blue-100 text-[#007AFF]" 
                              : "bg-[#F5F5F7] border-transparent text-[#1D1D1F] hover:bg-[#E8E8ED]"
                          )}
                        >
                          <span className="text-sm font-semibold">전체 상태</span>
                          {filters.settlementStatuses.length === 0 && <Check className="w-5 h-5" />}
                        </button>
                        {settlementOptions.map(option => {
                          const isSelected = filters.settlementStatuses.includes(option);
                          return (
                            <button
                              key={option}
                              onClick={() => toggleFilter('settlementStatuses', option)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all h-16",
                                isSelected 
                                  ? "bg-blue-50 border-blue-100 text-[#007AFF]" 
                                  : "bg-[#F5F5F7] border-transparent text-[#1D1D1F] hover:bg-[#E8E8ED]"
                              )}
                            >
                              <span className="text-sm font-semibold">{option}</span>
                              {isSelected && <Check className="w-5 h-5" />}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 pt-0 bg-white">
                <button 
                  onClick={() => setActiveFilterType(null)}
                  className="theme-btn-primary w-full shadow-lg shadow-blue-500/20"
                >
                  필터 적용
                </button>
                <div className="h-6" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
