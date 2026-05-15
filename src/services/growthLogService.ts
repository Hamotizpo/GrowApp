import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { GrowthLog } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const GROWTH_LOGS_COLLECTION = 'growth_logs';

export const subscribeToGrowthLogs = (plantId: string, callback: (logs: GrowthLog[]) => void) => {
  const q = query(
    collection(db, GROWTH_LOGS_COLLECTION),
    where('plantId', '==', plantId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const logs: GrowthLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as GrowthLog);
    });
    // Sort locally by date descending
    logs.sort((a, b) => {
      const dateA = typeof a.date === 'object' && (a.date as any).toMillis ? (a.date as any).toMillis() : (a.date || 0);
      const dateB = typeof b.date === 'object' && (b.date as any).toMillis ? (b.date as any).toMillis() : (b.date || 0);
      return dateB - dateA; // Descending
    });
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, GROWTH_LOGS_COLLECTION);
  });
};

export const addGrowthLog = async (log: Omit<GrowthLog, 'id' | 'date'>) => {
  try {
    const docRef = await addDoc(collection(db, GROWTH_LOGS_COLLECTION), {
      ...log,
      date: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, GROWTH_LOGS_COLLECTION);
  }
};

export const updateGrowthLog = async (id: string, data: Partial<GrowthLog>) => {
  const path = `${GROWTH_LOGS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, GROWTH_LOGS_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteGrowthLog = async (id: string) => {
  const path = `${GROWTH_LOGS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, GROWTH_LOGS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
