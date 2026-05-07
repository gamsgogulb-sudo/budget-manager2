export type TransactionType = 'income' | 'expense' | 'balance_adj' | 'transfer';

export interface Transaction {
  id: string;
  createdAt: string;
  category: string;
  subCategory: string;
  amount: number;
  paymentMethod: string;
  memo: string;
  date: string;
  settlementStatus: string;
  marker: boolean; // 🐴🐭
  newSubCategory: string;
  photoUrl?: string; // Legacy
  photoUrls?: string[]; // New: support multiple
  type: TransactionType;
  ownerId: string;
  transferId?: string;
  settledFromAccount?: string;
  settledToAccount?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isFavorite?: boolean;
}

export interface AccountCard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isFavorite?: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  period: string;
  startDate: string;
  notes?: string;
  ownerId: string;
}

export interface InvestmentAccount {
  id: string;
  bank: string;
  name: string;
  accountNumber: string;
  balance: number;
  investmentAmount: number;
  type: 'general' | 'ISA' | 'pension' | 'IRP';
  openDate: string;
  status: string;
  ownerId: string;
}

export interface Stock {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  buyDate: string;
  ownerId: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  theme: 'light' | 'dark';
  currentMode: 'personal' | 'shared';
  sharedWith: string[];
  googleSheetId?: string;
}
