
export interface Transaction {
  uniqueId: string;
  inputTime: string;
  category: string;
  subcategory: string;
  cost: number;
  account: string;
  note: string;
  date: string; // YYYY-MM-DD
  settlement: string;
  imageUrl?: string;
  rowIndex?: number;
  transferId?: string; // M열: 이동 ID
  settlementFromAccount?: string; // N열: 정산한통장
  settlementToAccount?: string;   // O열: 정산받은통장
  incomeSource?: string;          // P열: 수입처
}

export interface SalaryTemplateItem {
  category: string;
  subcategory: string;
  cost: number;
  account: string;
  note: string;
  settlement: string;
  rowIndex?: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  content: string;
  date: string;
  status: '대기' | '진행' | '완료' | '보류';
  rowIndex?: number;
}

export interface TodoGroup {
  id: string;
  title: string;
  memo: string;
  date: string;
  color?: string;
  rowIndex?: number;
}

export interface TodoItem {
  id: string;
  groupId: string; // 소속된 그룹 ID
  name: string;
  status: '대기' | '완료';
  date: string;
  rowIndex?: number;
}

export interface AssetPlan {
  id: string;
  title: string;
  content: string;
  date: string;
  tag: string;
  rowIndex?: number;
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  cycle: string;
  paymentMethod: string;
  startDate: string;
  tag: string;
  memo: string;
  status: '구독' | '해지';
  rowIndex?: number;
}

export type AccountType = '일반' | 'ISA' | 'IRP' | '연금저축';

export interface InvestmentItem {
  id: string;
  accountId?: string; // 계좌 연결을 위한 ID 추가
  name: string;
  broker: string;
  category: string;
  accountType: AccountType;
  date: string;
  price: number;
  quantity: number;
  totalCost: number;
  targetRatio: number;
  targetPrice: number;
  actualPrice: number;
  realizedProfit: number;
  note: string;
  stockCode?: string;
  currentPrice?: number;
  rowIndex?: number;
  sellDate?: string;
  soldQuantity?: number;
  soldPrice?: number;
  openingDate?: string;
}

export interface InvestmentGoal {
  category: string;
  targetRatio: number;
}

export interface AccountGoal {
  accountType: AccountType;
  targetRatio: number;
}

export interface InvestmentAccount {
  id: string;
  accountType: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  openDate: string;
  deposit: number;
  closeDate?: string;
  note?: string;
  rowIndex?: number;
}

export interface BankBalance {
  name: string;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
}

export interface ExpenseStat {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface FixedKeyword {
  keyword: string;
  category: '수입' | '지출';
  expectedAmount: number;
}

export interface AverageStat {
  subcategory?: string;
  account?: string;
  avgIncome: number;
  avgExpense: number;
  totalIncome: number;
  totalExpense: number;
  count: number;
  monthCount: number;
  currentPeriodTotal: number;
}

export interface DashboardData {
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
  transactionCount: number;
  recentTransactions: Transaction[];
  bankBalances: BankBalance[];
  expenseStats: ExpenseStat[];
  hiddenCategories: string[];
  hiddenAccounts: string[];
  baseDay: number;
}

export interface ProjectionConfig {
  monthlyContribution: number;
  expectedAnnualReturn: number;
  years: number;
}

export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type DashboardViewMode = 'basic' | 'detail';

export interface FilterState {
  period: '1month' | '3months' | '6months' | 'all' | 'custom';
  category: string;
  settlement: string;
  search: string;
  startDate: string;
  endDate: string;
}

export enum Tab {
  DASHBOARD = 'dashboard',
  INPUT = 'input',
  HISTORY = 'history',
  SUBSCRIPTION = 'subscription',
  INVESTMENT = 'investment',
  SETTINGS = 'settings'
}

export type Theme = 'dark' | 'light';
export type AppMode = 'default' | 'gulbi' | 'test';
