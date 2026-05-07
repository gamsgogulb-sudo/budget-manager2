import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedgers } from '../context/LedgerContext';
import { subscribeTransactions } from '../services/transactionService';
import { Transaction } from '../types';

export function useTransactions() {
  const { user } = useAuth();
  const { currentLedger } = useLedgers();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentLedger) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = subscribeTransactions(currentLedger.id, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, currentLedger?.id]);

  return { transactions, loading };
}
