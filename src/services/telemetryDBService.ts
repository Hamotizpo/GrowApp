import { db } from '../firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

export type LogEntry = {
  ts: number;
  level: number;
  tag: string;
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
    this.initLock();
  }

  public setIdentity(userId: string, deviceId: string) {
    this.userId = userId;
    this.deviceId = deviceId;
  }

  // Acquire an exclusive Web Lock so only one browser tab writes to Firestore
  private async initLock() {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      navigator.locks.request('growsafe_telemetry_writer', { mode: 'exclusive' }, (lock) => {
        return new Promise<void>((resolve) => {
          this.isActiveWriter = true;
          this.stopLock = () => {
            this.isActiveWriter = false;
            resolve();
          };
          this.startFlushing();
          console.log("[TelemetryDB] Acquired exclusive lock. This tab will write to Firestore.");
        });
      }).catch(err => {
        console.warn("[TelemetryDB] Web Locks request failed:", err);
      });
    } else {
      // Fallback for browsers without Web Locks API
      this.isActiveWriter = true;
      this.startFlushing();
    }
  }

  private startFlushing() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  public stop() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    if (this.stopLock) this.stopLock();
    this.flush();
  }

  public appendTelemetry(topic: string, data: any) {
    if (!this.isActiveWriter) return;
    this.buffer.push({ ts: Date.now(), topic, data });
  }

  public appendLog(level: number, tag: string, msg: string) {
    if (!this.isActiveWriter) return;
    this.logBuffer.push({ ts: Date.now(), level, tag, msg });
  }

  private async flush() {
    if (!this.isActiveWriter || !this.userId || !this.deviceId || this.deviceId === 'discovery') return;
    if (this.buffer.length === 0 && this.logBuffer.length === 0) return;

    const telemetryToFlush = [...this.buffer];
    const logsToFlush = [...this.logBuffer];
    this.buffer = [];
    this.logBuffer = [];

    const d = new Date();
    // Hourly buckets (e.g. "2026-05-10_11")
    const pad = (n: number) => n.toString().padStart(2, '0');
    const bucketId = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}`;

    try {
      if (telemetryToFlush.length > 0) {
        const teleRef = doc(db, 'users', this.userId, 'devices', this.deviceId, 'telemetry', bucketId);
        await setDoc(teleRef, {
          entries: arrayUnion(...telemetryToFlush)
        }, { merge: true });
      }

      if (logsToFlush.length > 0) {
        const logRef = doc(db, 'users', this.userId, 'devices', this.deviceId, 'logs', bucketId);
        await setDoc(logRef, {
          entries: arrayUnion(...logsToFlush)
        }, { merge: true });
      }

      console.debug(`[TelemetryDB] Flushed ${telemetryToFlush.length} telemetries and ${logsToFlush.length} logs to Firestore bucket ${bucketId}`);
    } catch (e) {
      console.error("[TelemetryDB] Failed to flush to Firestore", e);
      // Optional: push back to buffer if failed, but we might risk endless retries
      // For now, we drop it to avoid memory leaks.
    }
  }
}

export const telemetryDB = new TelemetryDBService();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    telemetryDB.stop();
  });
}
