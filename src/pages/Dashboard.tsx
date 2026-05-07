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

  const COLORS = ['#8B9178', '#6B705C', '#A67C52', '#DDE2D1', '#E8E3D8', '#C4B5A5'];

  if (loading) return <div className="flex h-64 items-center justify-center text-[#5C544E] font-bold">데이터를 불러오는 중...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="이번 달 지출" 
          value={formatCurrency(totalExpense)} 
          trend="누적 지출액" 
          color="rose" 
        />
        <StatCard 
          title="이번 달 수입" 
          value={formatCurrency(totalIncome)} 
          trend="누적 수입액" 
          color="emerald" 
        />
        <StatCard 
          title="현재 잔고" 
          value={formatCurrency(totalBalance)} 
          trend="가용 자산 합계" 
          color="primary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Expenses Pie Chart */}
        <div className="lg:col-span-1 theme-card p-6">
          <h2 className="font-display font-bold text-base text-[#5C544E] mb-4">지출 카테고리</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2.5">
            {categoryData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-slate-500">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[#5C544E]">{totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 theme-card p-6 flex flex-col">
          <h2 className="font-display font-bold text-base text-[#5C544E] mb-4">현금 흐름 자산</h2>
          <div className="flex-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#F9F7F2' }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[12, 12, 0, 0]} 
                  barSize={60}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#8B9178' : '#A67C52'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between items-center p-4 bg-[#F9F7F2] rounded-xl border border-[#EAE7E0]">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">월간 가용 자금</p>
              <p className={cn("text-lg font-display font-bold", totalBalance >= 0 ? "text-[#5C544E]" : "text-rose-600")}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">총 자산 대비</p>
              <p className="text-lg font-display font-bold text-[#A67C52]">
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
    rose: 'text-rose-600 bg-rose-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    primary: 'text-[#A67C52] bg-[#F2EFE9]',
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-[#EAE7E0] shadow-sm hover:shadow-md transition-all group">
      <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest leading-none">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-xl font-display font-bold text-[#5C544E]">{value}</h3>
      </div>
      <div className="mt-4 pt-3 border-t border-[#F9F7F2]">
        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-tight", colors[color])}>
          {trend}
        </span>
      </div>
    </div>
  );
}
