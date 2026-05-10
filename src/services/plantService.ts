import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Plant } from '../types';

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
    console.error('Error fetching plants:', error);
  });
};

export const addPlant = async (plant: Omit<Plant, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, PLANTS_COLLECTION), {
      ...plant,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding plant:', error);
    throw error;
  }
};

export const updatePlant = async (id: string, data: Partial<Plant>) => {
  try {
    const docRef = doc(db, PLANTS_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating plant:', error);
    throw error;
  }
};

export const deletePlant = async (id: string) => {
  try {
    const docRef = doc(db, PLANTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting plant:', error);
    throw error;
  }
};
