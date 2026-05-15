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
  telemetryHistory: any[]; // Unified history for advanced charting
}

export interface IoTSyncContextType {
  state: IoTState;
  mqttClient: MqttClient | null;
  deviceId: string | null;
  isConnected: boolean;
  sendCloudCommand: (cmd: string) => void;
  apiCall: (path: string, options?: any) => Promise<any>;
  loadHistory: (hours: number) => Promise<void>;
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
    env: [],
    telemetryHistory: []
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

  const loadHistoryForDevice = async (uid: string, devId: string, hours: number) => {
    try {
      const numBuckets = hours === -1 ? -1 : Math.max(1, Math.ceil(hours * 6));
      console.log(`[IoTSyncContext] Loading history covering ${hours}h (${numBuckets} buckets)`);
      const hLogs = await telemetryDB.fetchHistoricalLogs(uid, devId, numBuckets);
      let formattedLogs = hLogs.map((l: any) => ({
        id: 'mqtt_' + l.ts + Math.random(),
        ts: new Date(l.ts).toLocaleTimeString(),
        lvl: l.level,
        tag: l.tag,
        topic: l.topic,
        msg: l.msg
      }));

      const hTele = await telemetryDB.fetchHistoricalTelemetry(uid, devId, numBuckets);
      let formattedTele = hTele
        .filter((t: any) => t.topic.endsWith('/tele/sensors') || (t.topic.endsWith('/tele') && t.data?.type === 'sensors'))
        .map((t: any) => {
          const normalizedData = {
            ...t.data,
            temperature: t.data.temperature ?? t.data.t,
            humidity: t.data.humidity ?? t.data.h
          };
          return {
            ts: t.ts,
            t: normalizedData.temperature,
            h: normalizedData.humidity,
            p_pzem: t.data.pwr?.p ?? t.data.pzem?.p,
            p_ina: t.data.ina?.p,
            v: t.data.pwr?.v ?? t.data.ina?.v,
            a: t.data.pwr?.a ?? t.data.ina?.a
          };
        });

      // Simple Downsampling for performance if there's too much data
      if (formattedTele.length > 10000) {
        const factor = Math.ceil(formattedTele.length / 10000);
        formattedTele = formattedTele.filter((_, idx) => idx % factor === 0);
      }
      if (formattedLogs.length > 2000) {
        formattedLogs = formattedLogs.slice(-2000); // Only keep recent logs for UI responsiveness
      }

      setState(prev => {
        return {
          ...prev,
          logs: formattedLogs,
          telemetryHistory: formattedTele
        };
      });
    } catch(e) {
      console.warn("[IoTSyncContext] Failed to load history", e);
    }
  };

  const loadHistory = async (hours: number) => {
    if (user?.uid && deviceId) {
      await loadHistoryForDevice(user.uid, deviceId, hours);
    }
  };

  const connectToDevice = async (device: any, userId: string) => {
    if (mqttClient) {
      if (deviceId === device.id && mqttClient.connected) return;
      mqttClient.end();
    }
    
    setDeviceId(device.id);
    telemetryDB.setIdentity(userId, device.id);
    
    // Trigger backend cloud subscription
    fetch('/api/telemetry/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        deviceId: device.id,
        mqttHost: device.mqttHost,
        mqttPort: device.mqttPort
      })
    }).catch(err => console.error("Failed to trigger cloud subscription", err));

    // Initial preload: 1 hour (6 buckets)
    await loadHistoryForDevice(userId, device.id, 1);

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
            const baseV1 = `uc2/v1/${userId}/${device.id}`;
            const baseV2 = `uc2/v2/${userId}/${device.id}`;
            const sub = (base: string) => {
              client.subscribe(`${base}/tele/#`);
              client.subscribe(`${base}/tele`);
              client.subscribe(`${base}/state/#`);
              client.subscribe(`${base}/status`);
              client.subscribe(`${base}/config`);
              client.subscribe(`${base}/log`);
              client.subscribe(`${base}/esp_log`);
            };
            sub(baseV1);
            sub(baseV2);
        } else {
            client.subscribe("uc2/discovery/+/info");
            client.subscribe("uc2/discovery/+/tele/#");
            client.subscribe("uc2/discovery/+/state/#");
            client.subscribe("uc2/discovery/+/config");
            client.subscribe(`uc2/v1/${userId}/+/tele/sensors`);
            client.subscribe(`uc2/v2/${userId}/+/tele`);
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
    telemetryDB.appendLog(2, isEsp ? 'ESP' : 'LOG', payload, topic);

    setState(prev => {
      const newLog = {
        id: 'live_' + Date.now() + Math.random(),
        ts: new Date().toLocaleTimeString(),
        lvl: 2,
        tag: isEsp ? 'ESP' : 'LOG',
        topic,
        msg: payload
      };
      const logs = [newLog, ...prev.logs].slice(0, 100);
      return { ...prev, logs };
    });
  };

  const handleMqttData = (topic: string, data: any, userId: string) => {
    // 0. Global telemetry logging for ALL incoming JSON messages
    if (deviceId !== "discovery") {
      telemetryDB.appendTelemetry(topic, data);
      
      // Also add to live logs for easier debug
      setState(prev => {
        const newLog = {
          id: 'mqtt_' + Date.now() + Math.random(),
          ts: new Date().toLocaleTimeString(),
          lvl: 3, // DEBUG
          tag: 'MQTT',
          topic,
          msg: JSON.stringify(data, null, 2)
        };
        const logs = [newLog, ...prev.logs].slice(0, 200);
        return { ...prev, logs };
      });
    }

    // 0.1. Auto-Recovery for discovery phase
    if (deviceId === "discovery" && (topic.startsWith(`uc2/v1/${userId}/`) || topic.startsWith(`uc2/v2/${userId}/`)) && (topic.endsWith('/tele/sensors') || topic.endsWith('/tele'))) {
      const mac = topic.split('/')[3];
      console.log("[REACT-CLOUD] Recovering device:", mac);
      const deviceRef = doc(db, "users", userId, "devices", mac);
      setDoc(deviceRef, { id: mac, model: "ESP32", pairedAt: Date.now() }, { merge: true });
      return;
    }

    const isTele = topic.endsWith('/tele');
    const isSensors = topic.endsWith('/tele/sensors') || (isTele && data.type === 'sensors');
    const isSystemInfo = topic.endsWith('/tele/system') || (isTele && data.type === 'systemInfo');
    const isActorsSummary = topic.endsWith('/state/actors');
    const isActorSingle = topic.includes('/state/actor/');
    const isConfig = topic.endsWith('/config');
    const isLog = topic.endsWith('/log');

    if (isSensors) {
      // Normalize sensor data
      const normalizedData = {
        ...data,
        temperature: data.temperature ?? data.t,
        humidity: data.humidity ?? data.h
      };

      setState(prev => {
        const energy = { ...prev.energy };
        const now = Date.now();
        
        if (data.ina) energy.ina = [...energy.ina, { x: now, y: data.ina.p }].slice(-500);
        if (data.pwr) energy.pzem = [...energy.pzem, { x: now, y: data.pwr.p }].slice(-500);

        const envObj = { 
          x: now, 
          t: normalizedData.temperature !== undefined ? normalizedData.temperature : null, 
          h: normalizedData.humidity !== undefined ? normalizedData.humidity : null
        };
        const env = [...prev.env, envObj].slice(-500);
        
        // Comprehensive history for Data Explorer
        const historyEntry = {
          ts: now,
          t: normalizedData.temperature,
          h: normalizedData.humidity,
          p_pzem: data.pwr?.p ?? data.pzem?.p,
          p_ina: data.ina?.p,
          v: data.pwr?.v ?? data.ina?.v,
          a: data.pwr?.a ?? data.ina?.a
        };
        const telemetryHistory = [...(prev.telemetryHistory || []), historyEntry].slice(-1000);

        return { ...prev, sensors: normalizedData, energy, env, telemetryHistory };
      });
    } else if (isSystemInfo) {
      setState(prev => ({ ...prev, system: { ...prev.system, ...data } }));
      
      // Extract nested configs if present
      if (data.mqttConfig) {
        // Special handling if we need to store them elsewhere, but usually they just live in system state
      }
    } else if (isActorsSummary) {
      setState(prev => {
        const currentActors = prev.actors || {};
        const incomingActors = data.actors || {};
        const nextActors = { ...currentActors };
        
        Object.keys(incomingActors).forEach(actName => {
          nextActors[actName] = { ...(nextActors[actName] || {}), ...incomingActors[actName] };
        });

        return { ...prev, actors: nextActors };
      });
    } else if (isActorSingle) {
      const actorName = topic.split('/').pop();
      if (actorName) {
        setState(prev => ({
          ...prev,
          actors: {
            ...prev.actors,
            [actorName]: { ...(prev.actors[actorName] || {}), ...data }
          }
        }));
      }
    } else if (isConfig) {
      setState(prev => {
        const nextActors = { ...prev.actors };
        if (data.actors) {
          Object.keys(data.actors).forEach(actName => {
            nextActors[actName] = { ...(nextActors[actName] || {}), settings: data.actors[actName] };
          });
        }
        
        // Handle legacy fallbacks for env config
        const env = data.env || {};
        const envConfig = {
          ...env,
          // Temperature
          minTemperature: env.minTemperature ?? env.minTemp ?? env.tMin,
          maxTemperature: env.maxTemperature ?? env.maxTemp ?? env.tMax,
          criticalTemperature: env.criticalTemperature ?? env.criticalTemp ?? env.tCri ?? env.tCritic ?? env.criticalTemp,
          tempNightDiff: env.tempNightDiff ?? env.tNd ?? env.tempND ?? env.tempNd,
          
          // Humidity
          minHumidity: env.minHumidity ?? env.minHumi ?? env.hMin,
          maxHumidity: env.maxHumidity ?? env.maxHumi ?? env.hMax,
          humidityNightDiff: env.humidityNightDiff ?? env.humiNightDiff ?? env.hNd ?? env.humidND ?? env.humidNd,

          // Times
          dayStartTime: env.dayStartTime ?? env.dStart,
          nightStartTime: env.nightStartTime ?? env.nStart,

          // Soil (Soil ADC)
          soilAdcWet: env.soilAdcWet ?? env.wet,
          soilAdcMoist: env.soilAdcMoist ?? env.moist,
          soilAdcDry: env.soilAdcDry ?? env.dry,

          // External Actors (if renamed or simplified)
          external_vent_fan: env.external_vent_fan ?? env.extVent,
          external_int_fan: env.external_int_fan ?? env.extInt,
          external_humidifier: env.external_humidifier ?? env.extHumi,
          external_heater: env.external_heater ?? env.extHeat
        };

        return { 
          ...prev, 
          system: { ...prev.system, envConfig },
          actors: nextActors
        };
      });
    } else if (isLog || data.msg || data.ts) {
       handleLogData(JSON.stringify(data), topic);
    }
  };

  const sendCloudCommand = (cmd: string) => {
    if (!mqttClient || !mqttClient.connected) return;
    if (deviceId === "discovery") return;
    const baseV2 = `uc2/v2/${user?.uid}/${deviceId}`;
    console.log(`[MQTT] Publishing to ${baseV2}/cmd/serial: ${cmd}`);
    mqttClient.publish(`${baseV2}/cmd/serial`, cmd, { qos: 1 });
  };

  /**
   * Unified API Call that delegates to MQTT in cloud mode
   * and Fetch in local mode (not fully implemented here but follows the pattern)
   */
  const apiCall = async (path: string, options: any = {}) => {
    const method = options.method || 'GET';
    const body = options.body;

    if (method === 'GET') {
      // Return state from memory for GETs in cloud mode
      // This is a naive implementation, real apps might need to wait for data
      return {}; 
    }

    // Convert API path and body to a serial-style command for MQTT
    let cmd = "";
    const params = body instanceof URLSearchParams 
      ? Object.fromEntries(body) 
      : (typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body || {});
    
    if (path.includes('controlActor')) {
      cmd = `set pwm ${params.actor} ${params.state}`;
    } else if (path.includes('addTimeEntry')) {
      cmd = `set time ${params.actor} ${params.pwm} ${params.time} ${params.days}`;
    } else if (path.includes('setInterval')) {
      cmd = `set inter ${params.actor} ${params.on} ${params.off} ${params.start} ${params.end} ${params.days}`;
    } else if (path.includes('addImpulse')) {
      cmd = `set impuls ${params.actor} ${params.duration}`;
    } else if (path.includes('setSoftStart')) {
      const en = params.enable === "1" || params.enable === 1 ? "on" : "off";
      cmd = `set soft ${params.actor} ${en} ${params.duration}`;
    } else if (path.includes('setActorLimits')) {
      cmd = `set limits ${params.actor} ${params.min_threshold} ${params.max_cap}`;
      
      const baseV2 = `uc2/v2/${user?.uid}/${deviceId}`;
      if (mqttClient && mqttClient.connected) {
        // Option to additionally publish as a dedicated config JSON payload
        const limitsPayload = JSON.stringify({
          actor: params.actor,
          min_threshold: params.min_threshold,
          max_cap: params.max_cap,
          min: params.min_threshold,
          max: params.max_cap
        });
        mqttClient.publish(`${baseV2}/config/limits`, limitsPayload, { qos: 1 });
      }
    } else if (path.includes('setParameter')) {
      const target = params.target;
      const param = params.param;
      const value = params.value;
      
      // Map to legacy handleParameterCommand structure: set para [target] [param] [value]
      // ESP32 Handle: (target="min", param="temp"), (target="max", param="temp"), etc.
      let mappedTarget = target;
      let mappedParam = param;

      if (param === 'minTemperature') { mappedTarget = 'min'; mappedParam = 'temp'; }
      else if (param === 'maxTemperature') { mappedTarget = 'max'; mappedParam = 'temp'; }
      else if (param === 'criticalTemperature') { mappedTarget = 'critic'; mappedParam = 'temp'; }
      else if (param === 'tempNightDiff') { mappedTarget = 'nightdif'; mappedParam = 'temp'; }
      else if (param === 'minHumidity') { mappedTarget = 'min'; mappedParam = 'humid'; }
      else if (param === 'maxHumidity') { mappedTarget = 'max'; mappedParam = 'humid'; }
      else if (param === 'humidityNightDiff') { mappedTarget = 'nightdif'; mappedParam = 'humid'; }
      
      cmd = `set para ${mappedTarget} ${mappedParam} ${value}`;
    } else if (path.includes('setDayStart')) {
      cmd = `set daystart x ${params.time}`;
    } else if (path.includes('setNightStart')) {
      cmd = `set nightstart x ${params.time}`;
    } else if (path.includes('deleteControl') || path.includes('resetActor')) {
      const action = params.action || 'clear';
      const index = params.index !== undefined ? params.index : '';
      // Correct legacy order: cont [action] [actor] [index]
      cmd = `cont ${action} ${params.actor} ${index}`;
    } else if (path.includes('restart')) {
      cmd = "restart";
    }

    if (cmd) {
      if (mqttClient && mqttClient.connected) {
        sendCloudCommand(cmd);
      } else {
        console.warn("Device is offline. Command not sent to cloud:", cmd);
      }
      return { status: 'sent', cmd };
    }
    
    throw new Error(`No mapping for path: ${path}`);
  };

  return (
    <IoTSyncContext.Provider value={{ state, mqttClient, deviceId, isConnected, sendCloudCommand, apiCall, loadHistory } as any}>
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
