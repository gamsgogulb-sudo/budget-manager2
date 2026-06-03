
import { Transaction, DashboardData, ExpenseStat } from '../types';
import { HORSE_ACCOUNTS } from '../constants';

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `TXN_${timestamp}_${random}`;
};

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#6B7280'
];

/**
 * 거래 내역을 시간순으로 엄격하게 정렬합니다.
 */
export const sortTransactionsChronologically = (txns: Transaction[]): Transaction[] => {
  return [...txns].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    
    const timeA = a.inputTime || "";
    const timeB = b.inputTime || "";
    const timeCompare = timeA.localeCompare(timeB);
    if (timeCompare !== 0) return timeCompare;
    
    return a.uniqueId.localeCompare(b.uniqueId);
  });
};

export const isSameDate = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const getCustomMonthRange = (anchorDate: Date, baseDay: number) => {
  if (baseDay === 1) {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), baseDay - 1, 23, 59, 59, 999);
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, baseDay, 0, 0, 0, 0);
  return { start, end };
};

export const processDashboardData = (
  transactions: Transaction[], 
  managedAccounts: string[],
  hiddenCategories: string[] = [],
  hiddenAccounts: string[] = [],
  baseDay: number = 1
): DashboardData => {
  const today = new Date();
  const { start: startDate, end: endDate } = getCustomMonthRange(today, baseDay);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  
  // 전체 내역 정렬
  const allSorted = sortTransactionsChronologically(transactions);
  
  const monthlyTxns = allSorted.filter(t => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });

  const expenseMap: Record<string, number> = {};

  monthlyTxns.forEach(t => {
    if (t.category.includes('잔액조정')) return;
    if (t.cost > 0) monthlyIncome += t.cost;
    if (t.cost < 0) {
      const absCost = Math.abs(t.cost);
      monthlyExpense += absCost;
      if (t.category.includes('지출')) {
        expenseMap[t.subcategory] = (expenseMap[t.subcategory] || 0) + absCost;
      }
    }
  });

  const balances: Record<string, { income: number; expense: number; balance: number; count: number }> = {};
  managedAccounts.forEach(acc => {
    balances[acc] = { income: 0, expense: 0, balance: 0, count: 0 };
  });

  // 정렬된 순서대로 잔액 집계 (중요: 정합성 보장)
  allSorted.forEach(t => {
    const absCost = Math.abs(t.cost);
    
    // 1. 주 계좌 반영
    if (managedAccounts.includes(t.account)) {
      const b = balances[t.account];
      if (t.cost > 0) b.income += t.cost;
      else b.expense += absCost;
      b.balance += t.cost;
      b.count++;
    }

    // 2. 가상 정산 반영 (Non-Horse 계정만 대상)
    if (t.settlementFromAccount && managedAccounts.includes(t.settlementFromAccount) && !HORSE_ACCOUNTS.includes(t.settlementFromAccount)) {
      const b = balances[t.settlementFromAccount];
      b.expense += absCost;
      b.balance -= absCost;
      b.count++;
    }
    if (t.settlementToAccount && managedAccounts.includes(t.settlementToAccount) && !HORSE_ACCOUNTS.includes(t.settlementToAccount)) {
      const b = balances[t.settlementToAccount];
      b.income += absCost;
      b.balance += absCost;
      b.count++;
    }
  });

  const bankBalances = managedAccounts.map(name => ({
    name,
    income: balances[name].income,
    expense: balances[name].expense,
    balance: balances[name].balance,
    transactionCount: balances[name].count
  }));

  const rawStats = Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const finalExpenseStats: ExpenseStat[] = rawStats.map((item, index) => ({
    name: item.name,
    amount: item.amount,
    percentage: monthlyExpense > 0 ? (item.amount / monthlyExpense) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // 최근 내역은 역순으로 제공
  const recent = [...allSorted].reverse().slice(0, 10);

  return {
    monthlyIncome,
    monthlyExpense,
    balance: monthlyIncome - monthlyExpense,
    transactionCount: monthlyTxns.length,
    recentTransactions: recent,
    bankBalances,
    expenseStats: finalExpenseStats,
    hiddenCategories,
    hiddenAccounts,
    baseDay
  };
};

export const formatCurrency = (val: number) => {
  return Math.floor(val).toLocaleString('ko-KR') + '원';
};
