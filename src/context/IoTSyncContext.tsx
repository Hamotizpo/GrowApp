import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import mqtt, { MqttClient } from 'mqtt';
import { telemetryDB } from '../services/telemetryDBService';

// Typical IoT state interface
export interface IoTState {
  sensors: any;
  actors: any;
  system: any;
  logs: any[];
  energy: {
    ina: any[];
    pzem: any[];
  };
  env: any[];
}

interface IoTSyncContextType {
  state: IoTState;
  mqttClient: MqttClient | null;
  deviceId: string | null;
  isConnected: boolean;
  sendCloudCommand: (cmd: string) => void;
}

const IoTSyncContext = createContext<IoTSyncContextType | undefined>(undefined);

const GLOBAL_BROKER = "18f6ef16c2a143b393199361032fe7c2.s1.eu.hivemq.cloud";
const GLOBAL_PORT = 8884;
const GLOBAL_USER = "Growsafe";
const GLOBAL_PASS = "Bremen2016";

export function IoTSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mqttClient, setMqttClient] = useState<MqttClient | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<IoTState>({
    sensors: {},
    actors: {},
    system: {},
    logs: [],
    energy: {
      ina: [],
      pzem: []
    },
    env: []
  });

  useEffect(() => {
    if (!user) return;

    // 1. Listen to devices in Firestore
    const devicesRef = collection(db, "users", user.uid, "devices");
    const unsubscribe = onSnapshot(devicesRef, (snapshot) => {
      const devices: any[] = [];
      snapshot.forEach(doc => devices.push({ id: doc.id, ...doc.data() }));
      
      console.log("[REACT-CLOUD] Firestore Devices:", devices);
      
      if (devices.length > 0) {
        connectToDevice(devices[0], user.uid);
      } else {
        console.log("[REACT-CLOUD] No registered devices, entering discovery mode...");
        connectToDevice({ id: "discovery" }, user.uid);
      }
    });

    return () => {
      unsubscribe();
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, [user]);

  const connectToDevice = (device: any, userId: string) => {
    if (mqttClient) {
      if (deviceId === device.id && mqttClient.connected) return;
      mqttClient.end();
    }
    
    setDeviceId(device.id);
    const broker = device.mqttHost || GLOBAL_BROKER; 
    const port = device.mqttPort || GLOBAL_PORT;
    
    telemetryDB.setIdentity(userId, device.id);

    console.log(`[REACT-CLOUD] MQTT Connect: ${broker}:${port} (ID: ${device.id})`);
    
    const options = {
      clientId: `web_ui_${Math.random().toString(16).substring(2, 10)}`,
      username: device.mqttUser || GLOBAL_USER,
      password: device.mqttPassword || GLOBAL_PASS,
      clean: true, 
      connectTimeout: 15000, 
      reconnectPeriod: 5000,
    };

    try {
      const client = mqtt.connect(`wss://${broker}:${port}/mqtt`, options);
      setMqttClient(client);

      client.on('connect', () => {
        console.log("[REACT-CLOUD] MQTT Connected");
        setIsConnected(true);
        if (device.id !== "discovery") {
            const base = `uc2/v1/${userId}/${device.id}`;
            client.subscribe(`${base}/tele/#`);
            client.subscribe(`${base}/state/#`);
            client.subscribe(`${base}/status`);
            client.subscribe(`${base}/config`);
            client.subscribe(`${base}/log`);
            client.subscribe(`${base}/esp_log`);
        } else {
            client.subscribe("uc2/discovery/+/info");
            client.subscribe("uc2/discovery/+/tele/#");
            client.subscribe("uc2/discovery/+/state/#");
            client.subscribe("uc2/discovery/+/config");
            client.subscribe(`uc2/v1/${userId}/+/tele/sensors`);
        }
      });

      client.on('message', (topic, message) => {
        const payload = message.toString();
        
        if (topic.endsWith('/status')) {
            setIsConnected(payload === 'online');
            return;
        }

        try {
          const data = JSON.parse(payload);
          handleMqttData(topic, data, userId);
        } catch (e) {
          if (topic.endsWith('/log') || topic.endsWith('/esp_log')) {
            handleLogData(payload, topic);
          }
        }
      });

      client.on('error', (err) => {
        console.error("[REACT-CLOUD] MQTT Error:", err);
        setIsConnected(false);
      });

    } catch (e) { console.error("[REACT-CLOUD] Connection failed:", e); }
  };

  const handleLogData = (payload: string, topic: string) => {
    const isEsp = topic.endsWith('esp_log');
    telemetryDB.appendLog(2, isEsp ? 'ESP' : 'LOG', payload);

    setState(prev => {
      const newLog = {
        id: 'live_' + Date.now() + Math.random(),
        ts: new Date().toLocaleTimeString(),
        lvl: 2,
        tag: topic.endsWith('esp_log') ? 'ESP' : 'LOG',
        msg: payload
      };
      const logs = [newLog, ...prev.logs].slice(0, 100);
      return { ...prev, logs };
    });
  };

  const handleMqttData = (topic: string, data: any, userId: string) => {
    // Auto-Recovery for discovery phase
    if (deviceId === "discovery" && topic.startsWith(`uc2/v1/${userId}/`) && topic.endsWith('/tele/sensors')) {
      const mac = topic.split('/')[3];
      console.log("[REACT-CLOUD] Recovering device:", mac);
      const deviceRef = doc(db, "users", userId, "devices", mac);
      setDoc(deviceRef, { id: mac, model: "ESP32", pairedAt: Date.now() }, { merge: true });
      return;
    }

    if (topic.endsWith('/tele/sensors')) {
      telemetryDB.appendTelemetry('sensors', data);
      setState(prev => {
        const energy = { ...prev.energy };
        if (data.ina) energy.ina = [...energy.ina, { x: Date.now(), y: data.ina.p }].slice(-100);
        if (data.pwr) energy.pzem = [...energy.pzem, { x: Date.now(), y: data.pwr.p }].slice(-100);

        const envObj = { 
          x: Date.now(), 
          t: data.temperature !== undefined ? data.temperature : null, 
          h: data.humidity !== undefined ? data.humidity : null 
        };
        const env = [...prev.env, envObj].slice(-100);

        return { ...prev, sensors: data, energy, env };
      });
    } else if (topic.endsWith('/state/actors')) {
      telemetryDB.appendTelemetry('actors', data);
      setState(prev => {
        return { 
          ...prev, 
          actors: { ...prev.actors, ...data.actors } 
        };
      });
    } else if (topic.includes('/state/actor/')) {
      const actorName = topic.split('/').pop();
      if (actorName) {
        setState(prev => {
          return {
            ...prev,
            actors: {
              ...prev.actors,
              [actorName]: { ...prev.actors[actorName], ...data }
            }
          };
        });
      }
    } else if (topic.endsWith('/tele/system')) {
      telemetryDB.appendTelemetry('system', data);
      setState(prev => ({ ...prev, system: { ...prev.system, ...data } }));
    } else if (topic.endsWith('/config')) {
      telemetryDB.appendTelemetry('config', data);
      setState(prev => {
        const nextActors = { ...prev.actors };
        if (data.actors) {
          Object.keys(data.actors).forEach(actName => {
            nextActors[actName] = { ...(nextActors[actName] || {}), settings: data.actors[actName] };
          });
        }
        return { 
          ...prev, 
          system: { ...prev.system, envConfig: data.env },
          actors: nextActors
        };
      });
    } else if (data.msg || data.ts) {
       // JSON structure for log
       telemetryDB.appendLog(data.level !== undefined ? data.level : 2, data.tag || 'SYS', data.msg || JSON.stringify(data));
       setState(prev => {
        const newLog = {
          id: 'live_' + Date.now() + Math.random(),
          ts: data.ts || new Date().toLocaleTimeString(),
          lvl: data.level !== undefined ? data.level : 2,
          tag: data.tag || 'SYS',
          msg: data.msg || JSON.stringify(data)
        };
        const logs = [newLog, ...prev.logs].slice(0, 100);
        return { ...prev, logs };
      });
    }
  };

  const sendCloudCommand = (cmd: string) => {
    if (!mqttClient || !mqttClient.connected) return;
    if (deviceId === "discovery") return;
    const base = `uc2/v1/${user?.uid}/${deviceId}`;
    mqttClient.publish(`${base}/cmd/serial`, cmd, { qos: 1 });
  };

  return (
    <IoTSyncContext.Provider value={{ state, mqttClient, deviceId, isConnected, sendCloudCommand }}>
      {children}
    </IoTSyncContext.Provider>
  );
}

export function useIoTSync() {
  const context = useContext(IoTSyncContext);
  if (context === undefined) {
    throw new Error('useIoTSync must be used within a IoTSyncProvider');
  }
  return context;
}
