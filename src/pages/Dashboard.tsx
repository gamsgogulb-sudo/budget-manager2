import React, { useMemo, useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  startOfMonth, 
  endOfMonth, 
  format, 
  isWithinInterval, 
  eachDayOfInterval,
  parseISO,
  isSameDay,
  startOfDay,
  endOfDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';
import PeriodSelector, { getRangeFromPeriod, PeriodType } from '../components/PeriodSelector';

import DateNavHeader from '../components/DateNavHeader';

export default function Dashboard() {
  const { transactions, loading } = useTransactions();
  
  // Date Filtering State (Unified with Transactions)
  const today = new Date();
  const [isMonthlyView, setIsMonthlyView] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentViewDate, setCurrentViewDate] = useState(today);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);

  const [period, setPeriod] = useState<PeriodType>('month');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Sync range when month changes via arrows
  const handleViewDateChange = (newDate: Date) => {
    setCurrentViewDate(newDate);
    // When month changes via navigation, update the period to 'custom' to respect this specific month
    setPeriod('custom');
    setCustomRange({
      start: format(startOfMonth(newDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(newDate), 'yyyy-MM-dd'),
    });
  };

  // Define date range based on period
  // If period is 'today' or undefined and we're using scroller, prioritize that
  const dateRange = useMemo(() => {
    if (period === 'today') {
      return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
    }
    
    const range = getRangeFromPeriod(period, customRange);
    return { start: startOfDay(range.start), end: endOfDay(range.end) };
  }, [period, customRange, selectedDate]);

  // Summaries for scroller
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

  // Calculate balance per account (using ALL transactions to get current real balance)
  const accountStates = useMemo(() => {
    const accounts = Array.from(new Set(transactions.map(t => t.paymentMethod).filter(Boolean)));
    const transferTargets = Array.from(new Set(transactions.filter(t => t.type === 'transfer' && t.settledToAccount).map(t => t.settledToAccount!)));
    const allAccounts = Array.from(new Set([...accounts, ...transferTargets])) as string[];

    const balances: Record<string, number> = {};

    allAccounts.forEach(accName => {
      const accTransactions = transactions.filter(t => t.paymentMethod === accName || (t.type === 'transfer' && t.settledToAccount === accName));
      const lastAdj = accTransactions
        .filter(t => t.type === 'balance_adj' && t.paymentMethod === accName)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      let currentBal = lastAdj ? lastAdj.amount : 0;
      let startDate = lastAdj ? new Date(lastAdj.date) : new Date(0);

      accTransactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate <= startDate && lastAdj && (t.id !== lastAdj.id || t.paymentMethod !== accName)) return;
        if (lastAdj && t.id === lastAdj.id && t.paymentMethod === accName) return;

        if (t.paymentMethod === accName) {
          if (t.type === 'expense' || t.type === 'transfer') currentBal -= t.amount;
          else if (t.type === 'income') currentBal += t.amount;
        } else if (t.type === 'transfer' && t.settledToAccount === accName) {
          currentBal += t.amount;
        }
      });
      balances[accName] = currentBal;
    });
    return balances;
  }, [transactions]);

  // Filtered totals for the period
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => isWithinInterval(parseISO(t.date), dateRange));
  }, [transactions, dateRange]);

  const totalIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = (Object.values(accountStates) as number[]).reduce((acc, b) => acc + b, 0);

  // Chart Data: daily income/expense trend
  const trendData = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    return days.map(day => {
      const dayTransactions = periodTransactions.filter(t => isSameDay(parseISO(t.date), day));
      const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        date: format(day, 'MM/dd'),
        income,
        expense,
        net: income - expense
      };
    });
  }, [periodTransactions, dateRange]);

  // Category Distribution (Expense)
  const expenseCategoryData = useMemo(() => {
    const data = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) existing.value += t.amount;
        else acc.push({ name: t.category, value: t.amount });
        return acc;
      }, [] as { name: string, value: number }[])
      .sort((a, b) => b.value - a.value);
    return data;
  }, [periodTransactions]);

  // Category Distribution (Income)
  const incomeCategoryData = useMemo(() => {
    const data = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const existing = acc.find(item => item.name === t.category);
        if (existing) existing.value += t.amount;
        else acc.push({ name: t.category, value: t.amount });
        return acc;
      }, [] as { name: string, value: number }[])
      .sort((a, b) => b.value - a.value);
    return data;
  }, [periodTransactions]);

  const COLORS = ['#007AFF', '#5856D6', '#FF2D55', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-[#86868B] space-y-4">
      <RefreshCw className="w-8 h-8 animate-spin text-[#007AFF]" />
      <span className="font-semibold text-sm">기록을 불러오고 있습니다...</span>
    </div>
  );

  if (selectedAccount) {
    return (
      <AccountDetailView 
        accName={selectedAccount} 
        balance={accountStates[selectedAccount] || 0}
        transactions={transactions.filter(t => t.paymentMethod === selectedAccount || (t.type === 'transfer' && t.settledToAccount === selectedAccount))}
        onBack={() => setSelectedAccount(null)}
      />
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Date Navigation & Period Selection */}
      <DateNavHeader 
        currentViewDate={currentViewDate}
        onViewDateChange={handleViewDateChange}
        isMonthlyView={isMonthlyView}
        setIsMonthlyView={setIsMonthlyView}
        selectedDate={selectedDate}
        onSelectedDateChange={(day) => {
          setSelectedDate(day);
          setPeriod('today');
        }}
        dateRange={period !== 'today' ? dateRange : null}
        onPeriodClick={() => setIsPeriodSelectorOpen(true)}
        dailySummaries={dailySummaries}
        showViewToggle={false}
        showCalendar={false}
        summaryLabel={
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Summary</h2>
            <p className="text-sm font-semibold text-[#1D1D1F]">
              {period === 'today' 
                ? `${format(selectedDate, 'M월 d일')} 요약`
                : `${format(dateRange.start, 'yyyy.MM.dd')} - ${format(dateRange.end, 'yyyy.MM.dd')}`}
            </p>
          </div>
        }
      />

      {/* Unified Period Selector Modal/Sheet for Dashboard */}
      <AnimatePresence>
        {isPeriodSelectorOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPeriodSelectorOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-[#1D1D1F]">조회 기간 설정</h3>
                  <button onClick={() => setIsPeriodSelectorOpen(false)}>
                     <Search className="w-6 h-6 text-[#86868B]" />
                  </button>
                </div>
                
                <PeriodSelector 
                  period={period}
                  onChangePeriod={(p) => {
                    setPeriod(p);
                    if (p !== 'custom') setIsPeriodSelectorOpen(false);
                  }}
                  customRange={customRange}
                  onChangeCustomRange={setCustomRange}
                  variant="sheet"
                />

                <div className="mt-8">
                  <button 
                    onClick={() => setIsPeriodSelectorOpen(false)}
                    className="theme-btn-primary w-full h-14"
                  >
                    기간 적용하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="총 자산" 
          value={totalBalance} 
          icon={<Wallet className="w-5 h-5" />}
          color="primary"
          subtitle="전체 계좌 실시간 합계"
        />
        <SummaryCard 
          title="기간 수입" 
          value={totalIncome} 
          icon={<TrendingUp className="w-5 h-5" />}
          color="income"
          trend={`${incomeCategoryData.length}개 카테고리`}
        />
        <SummaryCard 
          title="기간 지출" 
          value={totalExpense} 
          icon={<TrendingDown className="w-5 h-5" />}
          color="spending"
          trend={`${expenseCategoryData.length}개 카테고리`}
        />
      </div>

      {/* Main Trends Area - Full Width */}
      <div className="theme-card p-6 min-h-[380px] flex flex-col">
        <div className="flex justify-between items-center mb-10">
          <h2 className="font-bold text-lg text-[#1D1D1F] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#007AFF]" />
            현금 흐름 추이
          </h2>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#86868B]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#34C759]"></div> 수입
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]"></div> 지출
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#86868B' }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ stroke: '#F2F2F7', strokeWidth: 2 }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                name="수입" 
                stroke="#34C759" 
                fillOpacity={1} 
                fill="url(#colorIncome)" 
                strokeWidth={3} 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                name="지출" 
                stroke="#FF3B30" 
                fillOpacity={1} 
                fill="url(#colorExpense)" 
                strokeWidth={3} 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryCard 
          title="지출 분포" 
          data={expenseCategoryData} 
          total={totalExpense}
          colors={COLORS}
        />
        <CategoryCard 
          title="수입 분포" 
          data={incomeCategoryData} 
          total={totalIncome}
          colors={[...COLORS].reverse()}
        />
      </div>

      {/* Account List - Bottom for scalability */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="font-bold text-lg text-[#1D1D1F] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#007AFF]" />
            보유 통장 내역
          </h2>
          <span className="text-[10px] font-bold text-[#86868B] bg-[#F5F5F7] px-2.5 py-1 rounded-full uppercase tracking-widest">
            {Object.entries(accountStates).length} ACCOUNTS
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(accountStates).length > 0 ? (
            (Object.entries(accountStates) as [string, number][]).map(([name, bal]) => (
              <AccountCard 
                key={name}
                name={name}
                balance={bal}
                onClick={() => setSelectedAccount(name)}
              />
            ))
          ) : (
            <div className="col-span-full theme-card p-12 text-center text-[#86868B] text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
              등록된 계좌가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, trend, subtitle }: { 
  title: string, value: number, icon: React.ReactNode, color: 'primary' | 'income' | 'spending', trend?: string, subtitle?: string 
}) {
  const styles = {
    primary: "text-[#007AFF] bg-[#007AFF]/10",
    income: "text-[#34C759] bg-[#34C759]/10",
    spending: "text-[#FF3B30] bg-[#FF3B30]/10",
  };

  return (
    <div className="theme-card p-6 flex flex-col justify-between group hover:translate-y-[-2px] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-xl transition-colors", styles[color])}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-[#86868B] bg-[#F5F5F7] px-2 py-1 rounded-md uppercase tracking-wider">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#86868B] mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">{formatCurrency(value)}</h3>
        {subtitle && <p className="text-[10px] text-[#86868B] font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface AccountCardProps {
  name: string;
  balance: number;
  onClick: () => void;
  key?: string;
}

function AccountCard({ name, balance, onClick }: AccountCardProps) {
  return (
    <button 
      onClick={onClick}
      className="theme-card p-5 text-left group hover:border-[#007AFF]/30 hover:shadow-lg transition-all"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#1D1D1F]">
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#86868B] mb-0.5">통장/카드</p>
            <p className="text-sm font-bold text-[#1D1D1F] leading-tight">{name}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase mb-0.5">현재 잔액</p>
            <p className={cn("text-lg font-bold tracking-tight", balance < 0 ? "text-[#FF3B30]" : "text-[#1D1D1F]")}>
              {formatCurrency(balance)}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#C7C7CC] group-hover:text-[#007AFF] transition-colors" />
        </div>
      </div>
    </button>
  );
}

function CategoryCard({ title, data, total, colors }: { title: string, data: any[], total: number, colors: string[] }) {
  return (
    <div className="theme-card p-6">
      <h2 className="font-bold text-lg text-[#1D1D1F] mb-6">{title}</h2>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-[180px] h-[180px] shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={85}
                strokeWidth={0}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Total</p>
            <p className="text-sm font-bold text-[#1D1D1F]">{formatCurrency(total)}</p>
          </div>
        </div>
        <div className="flex-1 space-y-3 w-full">
          {data.length > 0 ? data.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span className="text-xs font-semibold text-[#86868B]">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#1D1D1F] block">{formatCurrency(item.value)}</span>
                <span className="text-[10px] text-[#86868B] font-medium">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
              </div>
            </div>
          )) : (
            <div className="h-full flex items-center justify-center text-[#86868B] text-xs font-medium py-10">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountDetailView({ accName, balance, transactions, onBack }: {
  accName: string;
  balance: number;
  transactions: Transaction[];
  onBack: () => void;
}) {
  const sortedTs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[#86868B] hover:text-[#007AFF] font-bold text-sm transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        대시보드로 돌아가기
      </button>

      <div className="theme-card p-8 bg-gradient-to-br from-[#1D1D1F] to-[#434346] text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-[#86868B] uppercase tracking-widest mb-1 italic">Account Detail</p>
            <h2 className="text-2xl font-bold tracking-tight mb-4">{accName}</h2>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">현재 잔액</p>
          <p className="text-4xl font-bold tracking-tighter">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-[#1D1D1F] px-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#007AFF]" />
          최근 거래 내역
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {sortedTs.map((t) => (
            <div key={t.id} className="theme-card p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  t.type === 'income' ? "bg-[#34C759]/10 text-[#34C759]" :
                  t.type === 'expense' ? "bg-[#FF3B30]/10 text-[#FF3B30]" :
                  "bg-[#007AFF]/10 text-[#007AFF]"
                )}>
                  {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : 
                   t.type === 'expense' ? <ArrowDownRight className="w-5 h-5" /> : 
                   <RefreshCw className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1D1D1F] leading-tight">{t.memo || t.category}</p>
                  <p className="text-[10px] text-[#86868B] font-semibold">{format(parseISO(t.date), 'yyyy년 MM월 dd일')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-bold tracking-tight",
                  t.type === 'income' ? "text-[#34C759]" :
                  t.type === 'expense' ? "text-[#FF3B30]" :
                  "text-[#007AFF]"
                )}>
                  {t.type === 'expense' || (t.type === 'transfer' && t.paymentMethod === accName) ? '-' : '+'}
                  {formatCurrency(t.amount)}
                </p>
                <p className="text-[10px] text-[#86868B] font-bold uppercase">{t.subCategory || t.category}</p>
              </div>
            </div>
          ))}
          {sortedTs.length === 0 && (
            <div className="theme-card p-12 text-center text-[#86868B] text-sm">
              내역이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

