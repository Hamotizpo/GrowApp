import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';

interface HumidityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HumidityModal({ isOpen, onClose }: HumidityModalProps) {
  const { state, sendCloudCommand } = useIoTSync();
  const env = state.system?.envConfig || {};
  const currentHumidity = state.sensors?.humidity;

  const [hMin, setHMin] = useState<number | ''>('');
  const [hMax, setHMax] = useState<number | ''>('');
  const [hNd, setHNd] = useState<number | ''>('');
  const [fanBlock, setFanBlock] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setHMin(env.minHumidity ?? env.hMin ?? 40);
      setHMax(env.maxHumidity ?? env.hMax ?? 60);
      setHNd(env.humidityNightDiff ?? env.hNd ?? env.humidNd ?? env.humidND ?? 0);
      setFanBlock(!!(env.fanBlockWhenHumidifierActive ?? env.fanBlock ?? env.fBlock));
    }
  }, [isOpen, env]);

  const isValid = () => {
    if (hMin === '' || hMax === '' || hNd === '') return false;
    const nightMin = Number(hMin) + Number(hNd);
    const nightMax = Number(hMax) + Number(hNd);
    return Number(hMin) < Number(hMax) && nightMin < nightMax && nightMax <= 100;
  };

  const handleSave = () => {
    if (!isValid()) return;
    
    sendCloudCommand(`set para min humid ${hMin}`);
    sendCloudCommand(`set para max humid ${hMax}`);
    sendCloudCommand(`set para nightdif humid ${hNd}`);
    sendCloudCommand(`set para fanBlock active ${fanBlock ? 1 : 0}`);
    
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
      title="💧 Luftfeuchte"
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
      <div className="flex flex-col gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
            <span className="text-gray-400 text-sm font-bold uppercase">Aktuell</span>
            <strong className="text-xl">{currentHumidity !== undefined ? `${currentHumidity.toFixed(1)} %` : '-'}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <InputRow label="Minimum" value={hMin} onChange={setHMin} unit="%" min={0} max={100} />
            <InputRow label="Maximum" value={hMax} onChange={setHMax} unit="%" min={0} max={100} />
            <InputRow label="🌙 Nacht +" value={hNd} onChange={setHNd} unit="%" min={0} max={50} />
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Nacht addiert einen Prozentwert zum Tagesbereich.
          </div>
          
          {isValid() ? (
            <div className="text-sm mt-2 text-white/90">
              💧 Tag: {hMin}% - {hMax}% | Nacht: {Number(hMin) + Number(hNd)}% - {Number(hMax) + Number(hNd)}%
            </div>
          ) : (
            <div className="text-sm mt-2 text-red-400">
              Bitte gültige Feuchtewerte eingeben. (Min &lt; Max, Max Nacht ≤ 100)
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="font-bold flex items-center gap-2 mb-3"><span className="text-lg">🌀</span> Lüfter-Sperre</h4>
          <label className="flex items-start gap-4 cursor-pointer">
            <div className="flex-1">
              <div className="text-sm text-white/90">🌬️ Abluft blockieren solange der Luftbefeuchter läuft</div>
              <div className="text-xs text-gray-400 mt-1">Verhindert kalte Zugluft während der Befeuchtung.</div>
            </div>
            <input 
              type="checkbox" 
              checked={fanBlock}
              onChange={e => setFanBlock(e.target.checked)}
              className="mt-1 w-5 h-5 accent-emerald-500"
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
