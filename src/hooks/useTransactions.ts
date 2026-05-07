import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeTransactions } from '../services/transactionService';
import { Transaction } from '../types';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeTransactions(user.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return { transactions, loading };
}
