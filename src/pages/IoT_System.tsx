import React, { useState } from 'react';
import { useIoTSync } from '../context/IoTSyncContext';
import { motion } from 'framer-motion';
import { Settings, Cpu, HardDrive, Wifi, RefreshCw, PowerOff, Cloud, ShieldCheck, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function IoTSystem() {
  const { state, sendCloudCommand } = useIoTSync();
  const { system } = state;
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  const handleRestart = () => {
    if (confirm("Wirklich neu starten?")) {
      sendCloudCommand('restart');
    }
  };

  const handleWifiSave = () => {
    if (ssid) {
      sendCloudCommand(`set wifi ${ssid} ${password}`);
      alert("WiFi Konfiguration gesendet. ESP startet ggf. neu.");
    }
  };

  const fmtBytes = (v: number) => {
    if (v == null || isNaN(v)) return '–';
    const units = ['B','KB','MB','GB'];
    let u = 0; let n = Number(v);
    while (n >= 1024 && u < units.length-1) { n/=1024; u++; }
    return `${n.toFixed(u===0?0:1)} ${units[u]}`;
  };

  const [activeTab, setActiveTab] = useState<'hardware' | 'network' | 'mqtt'>('hardware');

  return (
    <div className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full overflow-y-scroll overflow-x-hidden w-full max-w-7xl mx-auto custom-scrollbar">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
          <div className="p-2 bg-slate-500/10 rounded-xl text-slate-400">
            <Settings className="w-6 h-6" />
          </div>
          System Settings
        </h1>
        <p className="text-muted-color text-sm mt-2">Hardware information and network configuration.</p>
        
        {/* Sub-tabs header */}
        <div className="mt-8 flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {['hardware', 'network', 'mqtt'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-colors whitespace-nowrap",
                activeTab === tab ? "bg-white/10 text-white border border-white/10" : "text-muted-color hover:bg-white/5 hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1">
        
        {activeTab === 'hardware' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-bg/80 backdrop-blur-xl border border-white/5 p-6 rounded-[24px] shadow-2xl flex flex-col max-w-4xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-widest uppercase">System Information</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm flex-1 bg-black/20 rounded-[20px] p-5 border border-white/5">
            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Uptime</div>
              <div className="font-mono text-white">{system?.uptime_s || '–'} s</div>
            </div>

            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Reset Reason</div>
              <div className="font-mono text-amber-400 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{system?.reset_reason || '–'} <span className="text-muted-color text-[10px]">(Code {system?.reset_reason_code || '-'})</span></div>
              <div className="font-mono text-white/50 text-[10px] mt-0.5">{system?.reset_detail || '–'}</div>
            </div>

            <div className="sm:col-span-2 my-2 border-t border-white/5" />

            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Chip</div>
              <div className="font-mono text-white flex items-center gap-1.5"><Cpu className="w-3 h-3" />{system?.chip_model || '–'} <span className="text-muted-color text-[10px]">(Rev {system?.chip_revision || '–'})</span></div>
            </div>
            
            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">CPU Freq</div>
              <div className="font-mono text-white">{system?.cpu_freq_mhz || '-'} MHz</div>
            </div>

            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">SDK</div>
              <div className="font-mono text-white truncate max-w-[150px]" title={system?.sdk_version || '–'}>{system?.sdk_version || '–'}</div>
            </div>
            
            <div>
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Build</div>
              <div className="font-mono text-white">{system?.build_date || ''} <span className="text-muted-color">{system?.build_time || ''}</span></div>
            </div>

            <div className="sm:col-span-2 my-2 border-t border-white/5" />
            
            <div className="sm:col-span-2">
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Memory</div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-white/5 p-2 px-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-emerald-400/70 font-bold tracking-widest">Heap (Free / Total)</span>
                  <span className="font-mono text-white text-xs">{fmtBytes(system?.heap_free)} / {fmtBytes(system?.heap_total)}</span>
                </div>
                <div className="bg-white/5 p-2 px-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-blue-400/70 font-bold tracking-widest">PSRAM (Free / Total)</span>
                  <span className="font-mono text-white text-xs">{system?.psram_found ? `${fmtBytes(system?.psram_free)} / ${fmtBytes(system?.psram_total)}` : 'N/A'}</span>
                </div>
                <div className="bg-white/5 p-2 px-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-amber-400/70 font-bold tracking-widest">Flash (Size / Sketch)</span>
                  <span className="font-mono text-white text-xs">{fmtBytes(system?.flash_size)} / {fmtBytes(system?.sketch_size)}</span>
                </div>
                <div className="bg-white/5 p-2 px-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-purple-400/70 font-bold tracking-widest">SPIFFS (Used / Total)</span>
                  <span className="font-mono text-white text-xs">{fmtBytes(system?.spiffs_used)} / {fmtBytes(system?.spiffs_total)}</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 my-2 border-t border-white/5" />

            <div className="sm:col-span-2">
              <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Network (STA)</div>
              <div className="font-mono flex items-center gap-2">
                {system?.wifi_connected ? (
                 <>
                   <Wifi className="w-4 h-4 text-emerald-400" />
                   <span className="text-emerald-400">{system?.wifi_ssid}</span>
                   <span className="text-muted-color text-[10px] ml-2">RSSI: {system?.wifi_rssi} dBm</span>
                 </>
                ) : (
                  <><Wifi className="w-4 h-4 text-slate-500" /><span className="text-slate-500">Disconnected</span></>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button 
              onClick={handleRestart}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-xl px-5 py-2.5 transition-colors text-sm font-bold border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Restart Device
            </button>
            <button 
              className="flex items-center gap-2 text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded-xl px-5 py-2.5 transition-colors text-sm font-bold"
            >
              <PowerOff className="w-4 h-4" />
              Factory Reset
            </button>
          </div>
        </motion.div>
        )}

        {/* Network config */}
        {activeTab === 'network' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-bg/80 backdrop-blur-xl border border-white/5 p-6 rounded-[24px] shadow-2xl max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <Wifi className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">Wi-Fi Configuration</h3>
            </div>
            
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex justify-between items-center mb-6">
              <div className="text-blue-200/70 text-xs font-bold uppercase tracking-widest">Pairing Code</div>
              <div className="font-mono text-xl font-bold text-blue-400 tracking-widest">------</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted-color mb-1.5 font-bold">WLAN SSID</label>
                <input 
                  type="text" 
                  value={ssid}
                  onChange={e => setSsid(e.target.value)}
                  placeholder="Network Name" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted-color mb-1.5 font-bold">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="•••••••• (leave blank to keep current)" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors text-sm font-medium"
                />
              </div>
              <button 
                onClick={handleWifiSave}
                className="bg-blue-500 hover:bg-blue-400 text-black rounded-xl px-6 py-3 w-full transition-colors text-sm font-bold mt-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                Save Network Settings
              </button>
              <p className="text-[10px] text-muted-color text-center mt-3 flex items-center justify-center gap-1.5"><Info className="w-3 h-3" /> Device will reboot to apply settings. UI will temporarily disconnect.</p>
            </div>
          </motion.div>
        )}

        {/* MQTT config */}
        {activeTab === 'mqtt' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-bg/80 backdrop-blur-xl border border-white/5 p-6 rounded-[24px] shadow-2xl relative overflow-hidden max-w-2xl"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 -mr-4 -mt-4"><Cloud size={100} /></div>
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <Cloud className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">MQTT Service</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm mb-6 pb-6 border-b border-white/5 relative z-10">
              <div>
                <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Status</div>
                <div className="font-mono text-emerald-400 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected</div>
              </div>

              <div>
                <div className="text-[10px] text-muted-color font-bold uppercase tracking-widest mb-1">Client ID</div>
                <div className="font-mono text-white/80 text-xs mt-1">growsafe-zelt-...</div>
              </div>
            </div>
            
            <button 
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl px-6 py-3 w-full transition-colors text-sm font-bold flex justify-center items-center gap-2 relative z-10"
            >
              <Cloud className="w-4 h-4" /> Use Global Broker
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
