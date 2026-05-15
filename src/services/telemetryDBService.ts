import { db } from '../firebase';
import { doc, setDoc, arrayUnion, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export type LogEntry = {
  ts: number;
  level: number;
  tag: string;
  topic?: string;
  msg: string;
};

export type TelemetryEntry = {
  ts: number;
  topic: string;
  data: any;
};

class TelemetryDBService {
  private buffer: TelemetryEntry[] = [];
  private logBuffer: LogEntry[] = [];
  private flushInterval: any = null;
  private isActiveWriter = false;
  private stopLock: (() => void) | null = null;
  private userId: string | null = null;
  private deviceId: string | null = null;

  constructor() {
    // Legacy: No longer needed for frontend lock since backend handles it
  }

  public setIdentity(userId: string, deviceId: string) {
    this.userId = userId;
    this.deviceId = deviceId;
  }

  public async fetchHistoricalTelemetry(userId: string, deviceId: string, limitCount = 6): Promise<TelemetryEntry[]> {
    try {
      if (deviceId === 'discovery') return [];
      
      const collRef = collection(db, 'users', userId, 'devices', deviceId, 'telemetry');
      const q = limitCount === -1 
        ? query(collRef, orderBy('bucketId', 'desc'))
        : query(collRef, orderBy('bucketId', 'desc'), limit(limitCount));
        
      const snapshot = await getDocs(q);
      let results: TelemetryEntry[] = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.entries && Array.isArray(data.entries)) {
          results = [...results, ...data.entries];
        }
      });
      return results.sort((a, b) => a.ts - b.ts);
    } catch (e) {
      console.error("[TelemetryDB] Failed to fetch historical telemetry", e);
      return [];
    }
  }

  public async fetchHistoricalLogs(userId: string, deviceId: string, limitCount = 6): Promise<LogEntry[]> {
    try {
      if (deviceId === 'discovery') return [];
      
      const collRef = collection(db, 'users', userId, 'devices', deviceId, 'logs');
      const q = limitCount === -1 
        ? query(collRef, orderBy('bucketId', 'desc'))
        : query(collRef, orderBy('bucketId', 'desc'), limit(limitCount));
        
      const snapshot = await getDocs(q);
      let results: LogEntry[] = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.entries && Array.isArray(data.entries)) {
          results = [...results, ...data.entries];
        }
      });
      return results.sort((a, b) => a.ts - b.ts);
    } catch (e) {
      console.error("[TelemetryDB] Failed to fetch historical logs", e);
      return [];
    }
  }

  public stop() {}

  public appendTelemetry(topic: string, data: any) {
    // Legacy: the backend now handles pushing data to the cloud
  }

  public appendLog(level: number, tag: string, msg: string, topic?: string) {
    // Legacy: the backend now handles pushing data to the cloud
  }
}

export const telemetryDB = new TelemetryDBService();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    telemetryDB.stop();
  });
}
