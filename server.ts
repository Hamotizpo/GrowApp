import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mqtt from "mqtt";

// Use Firebase Admin SDK for backend secure writing
import admin from 'firebase-admin';
import fs from 'fs';

let firebaseConfig = {} as any;
try {
  firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
} catch (e) {
  console.log("No firebase-applet-config.json found");
}

try {
  if (!admin.apps.length && firebaseConfig.firebaseProjectId) {
    admin.initializeApp({ projectId: firebaseConfig.firebaseProjectId });
  }
} catch (e) { console.error("Failed to init admin", e); }

const db = admin.apps.length > 0 ? admin.firestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // We can add a way for the frontend to tell the backend which devices to listen to
  const activeSubscriptions = new Map<string, mqtt.MqttClient>();

  app.post("/api/telemetry/subscribe", (req, res) => {
    const { userId, deviceId, mqttHost, mqttPort } = req.body;
    if (!userId || !deviceId) {
      return res.status(400).json({ error: "Missing userId or deviceId" });
    }

    if (activeSubscriptions.has(deviceId)) {
      return res.json({ status: "already_subscribed" });
    }

    const brokerUrl = `ws://${mqttHost || 'broker.emqx.io'}:${mqttPort || 8083}/mqtt`;
    console.log(`[Backend] Connecting to ${brokerUrl} for device ${deviceId}`);
    
    // Connect with a client id that won't conflict with frontend
    const client = mqtt.connect(brokerUrl, {
      clientId: `srv_growsafe_${deviceId}_${Math.random().toString(16).slice(2, 6)}`
    });

    client.on('connect', () => {
      console.log(`[Backend] Connected to MQTT for ${deviceId}`);
      client.subscribe(`tele/${deviceId}/#`, (err) => {
        if (!err) console.log(`[Backend] Subscribed to tele/${deviceId}/#`);
      });
      client.subscribe(`stat/${deviceId}/#`, (err) => {
        if (!err) console.log(`[Backend] Subscribed to stat/${deviceId}/#`);
      });
    });

    let telemetryBuffer: any[] = [];
    let logBuffer: any[] = [];
    let flushTimeout: NodeJS.Timeout | null = null;

    const flushFn = async () => {
      if ((telemetryBuffer.length === 0 && logBuffer.length === 0) || !db) return;
      
      const tb = [...telemetryBuffer];
      const lb = [...logBuffer];
      telemetryBuffer = [];
      logBuffer = [];

      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const minBucket = Math.floor(d.getUTCMinutes() / 10) * 10;
      const bucketId = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}_${pad(minBucket)}`;

      try {
        if (tb.length > 0) {
          await db.collection(`users/${userId}/devices/${deviceId}/telemetry`).doc(bucketId).set(
            { entries: admin.firestore.FieldValue.arrayUnion(...tb), bucketId },
            { merge: true }
          );
        }
        if (lb.length > 0) {
          await db.collection(`users/${userId}/devices/${deviceId}/logs`).doc(bucketId).set(
            { entries: admin.firestore.FieldValue.arrayUnion(...lb), bucketId },
            { merge: true }
          );
        }
        console.log(`[Backend] Flushed ${tb.length} telemetries and ${lb.length} logs for ${deviceId}`);
      } catch (err) {
        console.error(`[Backend] Failed to flush to firestore for ${deviceId}`, err);
      }
    };

    client.on('message', (topic, payload) => {
      let data = {} as any;
      const msgStr = payload.toString();
      try {
        data = JSON.parse(msgStr);
      } catch (e) {
        data = { raw: msgStr };
      }

      if (topic.endsWith('esp_log') || typeof data === 'string' || data.raw) {
        logBuffer.push({
          ts: Date.now(),
          level: 2,
          tag: topic.endsWith('esp_log') ? 'ESP' : 'LOG',
          topic,
          msg: data.raw || msgStr
        });
      } else {
        telemetryBuffer.push({
          ts: Date.now(),
          topic,
          data
        });
      }

      if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
          flushFn();
          flushTimeout = null;
        }, 15000); // flush every 15s
      }
    });

    activeSubscriptions.set(deviceId, client);
    res.json({ status: "subscribed" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
