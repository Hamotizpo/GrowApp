import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';

interface AirActorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AirActorsModal({ isOpen, onClose }: AirActorsModalProps) {
  const { state, sendCloudCommand } = useIoTSync();
  const env = state.system?.envConfig || {};
  const sysMode = state.system?.mode || 'AUTO';

  // These mappings follow original JS logic
  const [extVentFanState, setExtVentFanState] = useState(false);
  const [extIntFanState, setExtIntFanState] = useState(false);
  const [extHumidifierState, setExtHumidifierState] = useState(false);
  const [extHeaterState, setExtHeaterState] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExtVentFanState(!!env.external_vent_fan);
      setExtIntFanState(!!env.external_int_fan);
      setExtHumidifierState(!!env.external_humidifier);
      setExtHeaterState(!!env.external_heater);
    }
  }, [isOpen, env]);

  const handleSave = () => {
    sendCloudCommand(`set para ext_vfan active ${extVentFanState ? 1 : 0}`);
    sendCloudCommand(`set para ext_ifan active ${extIntFanState ? 1 : 0}`);
    sendCloudCommand(`set para ext_hum active ${extHumidifierState ? 1 : 0}`);
    sendCloudCommand(`set para ext_heat active ${extHeaterState ? 1 : 0}`);
    onClose();
  };

  const handleSystemMode = (mode: 'AUTO' | 'MANUAL') => {
    // Usually handled by UI, but here we can toggle
    sendCloudCommand(`set mode ${mode}`);
    onClose(); // Optional
  };

  const manualToggle = (actor: string, on: boolean) => {
    sendCloudCommand(`set force ${actor} ${on ? 1 : 0}`);
  };

  const SwitchRow = ({ label, emoji, checked, onChange }: any) => (
    <label className="flex items-center justify-between py-2 border-b border-white/5 cursor-pointer hover:bg-white/5 px-2 rounded -mx-2">
      <div className="flex flex-col">
        <span className="font-bold flex items-center gap-2">
          <span>{emoji}</span> {label}
        </span>
      </div>
      <input 
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 accent-emerald-500"
      />
    </label>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚙️ Klima & Aktoren Einstellungen"
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
            Schließen
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-sm font-bold">
            💾 Zuweisungen Speichern
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">System Modus</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSystemMode('AUTO')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors border ${
                sysMode === 'AUTO' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              🤖 AUTOMATIK
            </button>
            <button 
              onClick={() => handleSystemMode('MANUAL')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors border ${
                sysMode === 'MANUAL' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              ✋ MANUELL
            </button>
          </div>
          {sysMode === 'MANUAL' && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200/80 text-xs">
              <span className="font-bold text-amber-400 block mb-1">Achtung: Automatik pausiert.</span>
              Du kannst Abluft, Umluft und Heizung manuell schalten.
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => manualToggle('vent_fan', true)} className="px-2 py-1 bg-amber-500/20 rounded border border-amber-500/30">🌬️ An</button>
                <button onClick={() => manualToggle('vent_fan', false)} className="px-2 py-1 bg-white/10 rounded border border-white/10">🌬️ Aus</button>
                
                <button onClick={() => manualToggle('internal_fan', true)} className="px-2 py-1 bg-amber-500/20 rounded border border-amber-500/30">🌀 An</button>
                <button onClick={() => manualToggle('internal_fan', false)} className="px-2 py-1 bg-white/10 rounded border border-white/10">🌀 Aus</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Steckdosen-Zuweisung</h3>
          <p className="text-xs text-white/50 mb-3">Welche Aktoren werden über externe PDU Funk-Steckdosen geschaltet?</p>
          
          <div className="flex flex-col">
            <SwitchRow label="Abluft (Vent Fan)" emoji="🌬️" checked={extVentFanState} onChange={setExtVentFanState} />
            <SwitchRow label="Umluft (Int Fan)" emoji="🌀" checked={extIntFanState} onChange={setExtIntFanState} />
            <SwitchRow label="Befeuchter" emoji="💧" checked={extHumidifierState} onChange={setExtHumidifierState} />
            <SwitchRow label="Heizung" emoji="🔥" checked={extHeaterState} onChange={setExtHeaterState} />
          </div>
        </div>

      </div>
    </Modal>
  );
}
