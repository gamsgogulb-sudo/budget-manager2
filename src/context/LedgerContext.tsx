import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface Ledger {
  id: string;
  name: string;
  type: 'personal' | 'shared';
  ownerId: string;
  ownerEmail?: string;
  members: string[];
  memberEmails: string[];
  createdAt: any;
}

interface LedgerContextType {
  ledgers: Ledger[];
  currentLedger: Ledger | null;
  loading: boolean;
  switchLedger: (ledgerId: string) => void;
  createLedger: (name: string, type: 'personal' | 'shared', inviteEmails?: string[]) => Promise<string>;
  updateLedger: (ledgerId: string, data: Partial<Ledger>) => Promise<void>;
  deleteLedger: (ledgerId: string) => Promise<void>;
  inviteMember: (ledgerId: string, email: string) => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [currentLedger, setCurrentLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch ledgers for current user
  useEffect(() => {
    if (!user) {
      setLedgers([]);
      setCurrentLedger(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'ledgers'),
      where('memberEmails', 'array-contains', user.email)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ledgerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ledger[];
      
      setLedgers(ledgerList);

      if (ledgerList.length === 0) {
        // If we confirmed that there are NO ledgers after fetching
        setLoading(true);
        await createLedger(`${user.displayName || '개인'} 가계부`, 'personal');
      } else {
        // Set current ledger
        const savedId = localStorage.getItem(`currentLedgerId_${user.uid}`);
        const found = ledgerList.find(l => l.id === savedId) || ledgerList[0];
        setCurrentLedger(found);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const switchLedger = (ledgerId: string) => {
    const found = ledgers.find(l => l.id === ledgerId);
    if (found && user) {
      setCurrentLedger(found);
      localStorage.setItem(`currentLedgerId_${user.uid}`, ledgerId);
    }
  };

  const createLedger = async (name: string, type: 'personal' | 'shared', inviteEmails: string[] = []) => {
    if (!user) throw new Error('Auth required');

    const ledgerData = {
      name,
      type,
      ownerId: user.uid,
      ownerEmail: user.email,
      members: [user.uid],
      memberEmails: [user.email, ...inviteEmails],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'ledgers'), ledgerData);
    
    // If there were invite emails, we would ideally resolve them to UIDs
    // But for now, we'll store emails and check during login if a user's email is in any ledger's memberEmails
    
    return docRef.id;
  };

  const updateLedger = async (ledgerId: string, data: Partial<Ledger>) => {
    const ledgerRef = doc(db, 'ledgers', ledgerId);
    await updateDoc(ledgerRef, data);
  };

  const deleteLedger = async (ledgerId: string) => {
    const ledgerRef = doc(db, 'ledgers', ledgerId);
    await deleteDoc(ledgerRef);
    if (currentLedger?.id === ledgerId) {
      setCurrentLedger(null);
    }
  };

  const inviteMember = async (ledgerId: string, email: string) => {
    const ledgerRef = doc(db, 'ledgers', ledgerId);
    
    // Find user by email to get UID
    const userQuery = query(collection(db, 'users'), where('email', '==', email));
    const userSnap = await getDocs(userQuery);
    
    if (!userSnap.empty) {
      const targetUid = userSnap.docs[0].id;
      await updateDoc(ledgerRef, {
        members: arrayUnion(targetUid),
        memberEmails: arrayUnion(email)
      });
    } else {
      // User doesn't exist yet, just add to emails
      await updateDoc(ledgerRef, {
        memberEmails: arrayUnion(email)
      });
    }
  };

  // Special logic for invited users: 
  // When a user logs in, check if their email is in any ledger's memberEmails but not in members
  useEffect(() => {
    if (user && ledgers.length > 0) {
      ledgers.forEach(async (ledger) => {
        if (ledger.memberEmails.includes(user.email!) && !ledger.members.includes(user.uid)) {
          const ledgerRef = doc(db, 'ledgers', ledger.id);
          await updateDoc(ledgerRef, {
            members: arrayUnion(user.uid)
          });
        }
      });
    }
  }, [user, ledgers]);

  return (
    <LedgerContext.Provider value={{ ledgers, currentLedger, loading, switchLedger, createLedger, updateLedger, deleteLedger, inviteMember }}>
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedgers() {
  const context = useContext(LedgerContext);
  if (context === undefined) {
    throw new Error('useLedgers must be used within a LedgerProvider');
  }
  return context;
}
