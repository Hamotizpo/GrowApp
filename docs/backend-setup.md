# GrowSafe Backend Setup & Architecture

## Server Details
- **Provider:** Hetzner
- **Type:** CX23 (4 GB RAM, 40 GB NVMe, 2 VCPU)
- **OS:** Ubuntu 24.04
- **IP Address:** 204.168.186.73

## Software Stack (Docker Compose)
We use a 3-container stack managed via Docker Compose in the `~/growsafe-stack` directory:
1. **Eclipse Mosquitto (MQTT Broker)**: Handles communication between ESP32 and the server (Port 1883).
2. **InfluxDB 2.7**: Time-series database for long-term storage of sensors, states, and telemetry (Port 8086).
3. **Node-RED**: Integration layer/rules engine that subscribes to MQTT and writes into InfluxDB (Port 1880).

## 1. Directory Structure on Server
```bash
~/growsafe-stack/
├── docker-compose.yml
├── mosquitto/
│   ├── config/
│   │   ├── mosquitto.conf
│   │   └── pwfile
│   ├── data/
│   └── log/
├── nodered/
│   └── data/
└── influxdb/
    └── data/
```

## 2. Docker Compose File (`docker-compose.yml`)
Standard setup linking the three services in a custom bridge network (`growsafe-stack_default`).

## 3. MQTT Credentials
Users created in Mosquitto (`mosquitto_passwd`):
- `esp32_client` (Used by the ESP32 to publish data)
- `nodered_client` (Used by Node-RED to subscribe to data)

*Note: Passwords are managed securely on the server in `/mosquitto/config/pwfile`.*

## 4. InfluxDB Setup
1. Access InfluxDB UI: `http://204.168.186.73:8086`
2. Create an initial User, Organization (e.g., `GrowsafeOrg`), and Bucket (e.g., `growsafe_telemetry`).
3. Generate an API Token (Load Data > API Tokens) with Write access to the bucket. Save this token for Node-RED.

## 5. Node-RED Setup (Data Pipeline)
1. Access Node-RED UI: `http://204.168.186.73:1880`
2. Connect to MQTT:
   - Add an `mqtt in` node.
   - Server: `mosquitto:1883`
   - Topic: `uc2/#`
   - Security: Use `nodered_client` credentials.
3. Parse and Format Data:
   - Pass the message through a `json` node.
   - Use a `function` node to format the payload for InfluxDB.
4. Write to InfluxDB:
   - Install the node `node-red-contrib-influxdb` (via Manage Palette).
   - Add an `influxdb out` node (Version 2.0).
   - Server: `http://influxdb:8086`
   - Organization: `GrowsafeOrg`
   - Bucket: `growsafe_telemetry`
   - Token: Use the token generated in InfluxDB.

### Node-RED Function Node Logic Example
```javascript
// Check if payload is valid
if (!msg.payload || !msg.payload.type) return null;

const type = msg.payload.type;
const device = msg.payload.device || "unknown";
let points = [];

if (type === "sensors") {
    points.push({
        measurement: "environment",
        tags: { device: device },
        fields: {
            temperature: msg.payload.temperature,
            humidity: msg.payload.humidity,
            soil_pot1: msg.payload.soil?.pot1,
            soil_pot2: msg.payload.soil?.pot2
        },
        timestamp: new Date()
    });
} else if (type === "actorState") {
    const actors = msg.payload.actors;
    if (actors) {
        for (const [actorName, data] of Object.entries(actors)) {
            points.push({
                measurement: "actuators",
                tags: { device: device, actor: actorName },
                fields: {
                    on: data.on ? 1 : 0,
                    pwm: data.pwm
                },
                timestamp: new Date()
            });
        }
    }
}

// Proceed only if there are points to write
if (points.length > 0) {
    msg.payload = points;
    return msg;
}
return null;
```

## Maintenance & Logs
- **View Container Status:** `docker compose ps`
- **View Mosquitto Logs:** `docker compose logs mosquitto`
- **View Node-RED Logs:** `docker compose logs nodered`
- **Restart Stack:** `docker compose restart`
