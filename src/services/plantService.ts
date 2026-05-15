import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plant } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const PLANTS_COLLECTION = 'plants';

export const subscribeToPlants = (userId: string, callback: (plants: Plant[]) => void) => {
  const q = query(collection(db, PLANTS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const plants: Plant[] = [];
    snapshot.forEach((doc) => {
      plants.push({ id: doc.id, ...doc.data() } as Plant);
    });
    callback(plants);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, PLANTS_COLLECTION);
  });
};

export const addPlant = async (plant: Omit<Plant, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, PLANTS_COLLECTION), {
      ...plant,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PLANTS_COLLECTION);
  }
};

export const updatePlant = async (id: string, data: Partial<Plant>) => {
  const path = `${PLANTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, PLANTS_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deletePlant = async (id: string) => {
  const path = `${PLANTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, PLANTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
