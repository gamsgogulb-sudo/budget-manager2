import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction, TransactionType } from '../types';

const COLLECTION_NAME = 'transactions';

export function subscribeTransactions(ledgerId: string, callback: (transactions: Transaction[]) => void) {
  const path = `ledgers/${ledgerId}/${COLLECTION_NAME}`;
  const q = query(
    collection(db, path),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Transaction[];
    callback(transactions);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addTransaction(ledgerId: string, userId: string, data: Omit<Transaction, 'id' | 'ownerId'>) {
  const path = `ledgers/${ledgerId}/${COLLECTION_NAME}`;
  const transactionData = {
    ...data,
    ownerId: userId,
  };
  try {
    return await addDoc(collection(db, path), transactionData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransaction(ledgerId: string, transactionId: string, data: Partial<Transaction>) {
  const path = `ledgers/${ledgerId}/${COLLECTION_NAME}/${transactionId}`;
  const docRef = doc(db, path);
  try {
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTransaction(ledgerId: string, transactionId: string) {
  const path = `ledgers/${ledgerId}/${COLLECTION_NAME}/${transactionId}`;
  const docRef = doc(db, path);
  try {
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Sub Categories
export async function addSubCategory(ledgerId: string, userId: string, name: string, description?: string) {
  const path = `ledgers/${ledgerId}/subCategories`;
  const data: any = { name, ownerId: userId, isFavorite: false };
  if (description !== undefined) data.description = description;
  try {
    return await addDoc(collection(db, path), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateSubCategory(ledgerId: string, id: string, data: Partial<any>) {
  const path = `ledgers/${ledgerId}/subCategories/${id}`;
  const docRef = doc(db, path);
  try {
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeSubCategories(ledgerId: string, callback: (data: any[]) => void) {
  const path = `ledgers/${ledgerId}/subCategories`;
  const q = query(collection(db, path), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

// Account Cards
export async function addAccountCard(ledgerId: string, userId: string, name: string, description?: string) {
  const path = `ledgers/${ledgerId}/accountCards`;
  const data: any = { name, ownerId: userId, isFavorite: false };
  if (description !== undefined) data.description = description;
  try {
    return await addDoc(collection(db, path), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateAccountCard(ledgerId: string, id: string, data: Partial<any>) {
  const path = `ledgers/${ledgerId}/accountCards/${id}`;
  const docRef = doc(db, path);
  try {
    return await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeAccountCards(ledgerId: string, callback: (data: any[]) => void) {
  const path = `ledgers/${ledgerId}/accountCards`;
  const q = query(collection(db, path), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}
