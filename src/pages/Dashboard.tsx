import React, { useMemo } from 'react';
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
  Cell
} from 'recharts';

export default function Dashboard() {
  const { transactions, loading } = useTransactions();

  // Calculate balance per account
  const accountStates = useMemo(() => {
    // Group transactions by date desc to easily find most recent adj
    const sortedTs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get unique accounts
    const accounts = Array.from(new Set(transactions.map(t => t.paymentMethod).filter(Boolean)));
    const transferTargets = Array.from(new Set(transactions.filter(t => t.type === 'transfer' && t.settledToAccount).map(t => t.settledToAccount!)));
    const allAccounts = Array.from(new Set([...accounts, ...transferTargets]));

    const balances: Record<string, number> = {};

    (allAccounts as string[]).forEach(accName => {
      const accTransactions = transactions.filter(t => t.paymentMethod === accName || (t.type === 'transfer' && t.settledToAccount === accName));
      
      // Find most recent balance adjustment for this account
      const lastAdj = accTransactions
        .filter(t => t.type === 'balance_adj' && t.paymentMethod === accName)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      let currentBal = 0;
      let startDate = new Date(0);

      if (lastAdj) {
        currentBal = lastAdj.amount;
        startDate = new Date(lastAdj.date);
      }

      // Sum up subsequent transactions
      accTransactions.forEach(t => {
        if (new Date(t.date) <= startDate && lastAdj && (t.id !== lastAdj.id || t.paymentMethod !== accName)) return;
        if (lastAdj && t.id === lastAdj.id && t.paymentMethod === accName) return; // Skip the adjustment itself as it's the base

        if (t.paymentMethod === accName) {
          if (t.type === 'expense') currentBal -= t.amount;
          else if (t.type === 'income') currentBal += t.amount;
          else if (t.type === 'transfer') currentBal -= t.amount;
        } else if (t.type === 'transfer' && t.settledToAccount === accName) {
          currentBal += t.amount;
        }
      });

      balances[accName] = currentBal;
    });

    return balances;
  }, [transactions]);

  const totalBalance = (Object.values(accountStates) as number[]).reduce((acc, b) => acc + b, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Prepare chart data
  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, [] as { name: string, value: number }[])
    .sort((a, b) => b.value - a.value);

  const barData = [
    { name: '수입', amount: totalIncome },
    { name: '지출', amount: totalExpense },
  ];

  const COLORS = ['#007AFF', '#5856D6', '#FF2D55', '#34C759', '#FF9500', '#AF52DE'];

  if (loading) return <div className="flex h-64 items-center justify-center text-[#86868B] font-semibold text-sm">기록을 정리하고 있습니다...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="이번 달 지출" 
          value={formatCurrency(totalExpense)} 
          trend="Total Spent" 
          color="spending" 
        />
        <StatCard 
          title="이번 달 수입" 
          value={formatCurrency(totalIncome)} 
          trend="Total Income" 
          color="income" 
        />
        <StatCard 
          title="현재 잔액" 
          value={formatCurrency(totalBalance)} 
          trend="Available Funds" 
          color="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Expenses Pie Chart */}
        <div className="lg:col-span-1 theme-card p-6">
          <h2 className="font-semibold text-base text-[#1D1D1F] mb-6">분류별 지출</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={65}
                  outerRadius={85}
                  strokeWidth={0}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {categoryData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs font-semibold text-[#86868B]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[#1D1D1F]">{totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 theme-card p-6 flex flex-col">
          <h2 className="font-semibold text-base text-[#1D1D1F] mb-6">현금 흐름 분석</h2>
          <div className="flex-1 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 500, fill: '#86868B' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#F5F5F7', opacity: 0.4 }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[8, 8, 8, 8]} 
                  barSize={48}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#34C759' : '#FF3B30'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex justify-between items-center p-5 bg-[#F5F5F7] rounded-2xl">
            <div>
              <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mb-1">상태 요약</p>
              <p className={cn("text-xl font-bold tracking-tight", totalBalance >= 0 ? "text-[#1D1D1F]" : "text-[#FF3B30]")}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mb-1">수입 대비 비중</p>
              <p className="text-xl font-bold tracking-tight text-[#007AFF]">
                {totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, color }: { title: string, value: string, trend: string, color: string }) {
  const colors: Record<string, string> = {
    spending: 'text-[#FF3B30] bg-[#FF3B30]/10',
    income: 'text-[#34C759] bg-[#34C759]/10',
    primary: 'text-[#007AFF] bg-[#007AFF]/10',
  };

  return (
    <div className="theme-card p-6 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
      <p className="text-xs font-semibold text-[#86868B] mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">{value}</h3>
      </div>
      <div className="mt-4 pt-4 border-t border-[#F2F2F7]">
        <span className={cn("text-[10px] font-bold px-2.5 py-1.5 rounded-lg tracking-wide uppercase", colors[color])}>
          {trend}
        </span>
      </div>
    </div>
  );
}
