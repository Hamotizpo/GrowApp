import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';

interface TempModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TempModal({ isOpen, onClose }: TempModalProps) {
  const { state, sendCloudCommand, apiCall } = useIoTSync();
  const env = state.system?.envConfig || {};
  const currentTemp = state.sensors?.temperature;

  const [tMin, setTMin] = useState<number | ''>('');
  const [tMax, setTMax] = useState<number | ''>('');
  const [tCri, setTCri] = useState<number | ''>('');
  const [tNd, setTNd] = useState<number | ''>('');

  const prevEnvRef = React.useRef('');

  useEffect(() => {
    if (!isOpen) {
      prevEnvRef.current = '';
      return;
    }

    const envStr = JSON.stringify(env);
    if (envStr !== prevEnvRef.current && Object.keys(env).length > 0) {
      setTMin(env.minTemperature ?? env.tMin ?? 20);
      setTMax(env.maxTemperature ?? env.tMax ?? 28);
      setTCri(env.criticalTemperature ?? env.tCri ?? env.tCritic ?? 40);
      setTNd(env.tempNightDiff ?? env.tNd ?? env.tempNd ?? env.tempND ?? 0);
      prevEnvRef.current = envStr;
    }
  }, [isOpen, env]);

  const isValid = () => {
    if (tMin === '' || tMax === '' || tCri === '' || tNd === '') return false;
    const nightMin = Number(tMin) + Number(tNd);
    const nightMax = Number(tMax) + Number(tNd);
    return Number(tMin) < Number(tMax) && Number(tMax) < Number(tCri) && nightMin < nightMax && nightMax < Number(tCri);
  };

  const handleSave = async () => {
    if (!isValid()) return;
    
    // Using apiCall for centralized command generation
    await apiCall('/api/setParameter', { method: 'POST', body: { target: 'min', param: 'temp', value: tMin } });
    await apiCall('/api/setParameter', { method: 'POST', body: { target: 'max', param: 'temp', value: tMax } });
    await apiCall('/api/setParameter', { method: 'POST', body: { target: 'critic', param: 'temp', value: tCri } });
    await apiCall('/api/setParameter', { method: 'POST', body: { target: 'nightdif', param: 'temp', value: tNd } });
    
    onClose();
  };

  const InputRow = ({ label, value, onChange, unit, min, max }: any) => (
    <div className="flex items-center justify-between gap-2 py-1">
      <label className="text-sm flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <input 
          type="number"
          min={min} max={max}
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-right text-white outline-none focus:border-emerald-500/50"
        />
        <span className="text-gray-400 text-sm w-6">{unit}</span>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🌡️ Temperatur"
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
            ✖️ Schließen
          </button>
          <button 
            onClick={handleSave} 
            disabled={!isValid()}
            className="px-4 py-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold"
          >
            💾 Übernehmen
          </button>
        </>
      }
    >
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
          <span className="text-gray-400 text-sm font-bold uppercase">Aktuell</span>
          <strong className="text-xl">{currentTemp !== undefined ? `${currentTemp.toFixed(1)} °C` : '-'}</strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <InputRow label="Minimum" value={tMin} onChange={setTMin} unit="°C" min={-20} max={60} />
          <InputRow label="Maximum" value={tMax} onChange={setTMax} unit="°C" min={-10} max={70} />
          <InputRow label="🔥 Kritisch" value={tCri} onChange={setTCri} unit="°C" min={0} max={90} />
          <InputRow label="🌙 Nacht Δ" value={tNd} onChange={setTNd} unit="°C" min={-15} max={15} />
        </div>

        <div className="text-xs text-gray-400 mt-2">
          Der Nachtwert addiert/zieht vom Tagesbereich ab.
        </div>
        
        {isValid() ? (
          <div className="text-sm mt-2 text-white/90">
            Tag: {tMin}° - {tMax}°C | Nacht: {Number(tMin) + Number(tNd)}° - {Number(tMax) + Number(tNd)}°C | 🔥 Kritisch: {tCri}°C
          </div>
        ) : (
          <div className="text-sm mt-2 text-red-400">
            Bitte gültige Temperaturwerte eingeben. (Min &lt; Max &lt; Kritisch)
          </div>
        )}
      </div>
    </Modal>
  );
}
