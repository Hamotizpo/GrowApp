import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';

interface PotModalProps {
  isOpen: boolean;
  onClose: () => void;
  index: number; // 1 or 2
}

export default function PotModal({ isOpen, onClose, index }: PotModalProps) {
  const { state, sendCloudCommand } = useIoTSync();
  const env = state.system?.envConfig || {};
  const currentRaw = state.sensors?.soil?.[`raw${index}`];
  const currentState = state.sensors?.soil?.[`pot${index}`];

  const [inWet, setInWet] = useState<number | ''>('');
  const [inMoist, setInMoist] = useState<number | ''>('');
  const [inDry, setInDry] = useState<number | ''>('');

  const toScale15 = (adc: number | undefined) => {
    if (adc === undefined) return '-';
    const v = Math.floor(Math.max(0, Math.min(4095, Number(adc) || 0)) * 14 / 4095) + 1;
    return Math.max(1, Math.min(15, v));
  };

  const prevEnvRef = React.useRef('');

  useEffect(() => {
    if (!isOpen) {
      prevEnvRef.current = '';
      return;
    }

    const envStr = JSON.stringify(env);
    if (envStr !== prevEnvRef.current && Object.keys(env).length > 0) {
      setInWet(toScale15(env.soilAdcWet ?? 0) as number);
      setInMoist(toScale15(env.soilAdcMoist ?? 0) as number);
      setInDry(toScale15(env.soilAdcDry ?? 4095) as number);
      prevEnvRef.current = envStr;
    }
  }, [isOpen, env]);

  const levelTxt = ["ERR", "Nass", "Feucht", "Trocken?", "Trocken"];

  const handleTeach = (level: string) => {
    if (index === 1 || index === 2) {
      sendCloudCommand(`set soilteach ${index - 1} ${level}`);
      alert(`Kalibrierung für Topf ${index} (${level}) gesendet`);
    }
  };

  const handleThresholdsApply = () => {
    // Note: The ESP32 backend has replaced 'set soilth' with 'set water [Threshold] [impulse] [sec]'.
    // The previous implementation sent 3 parameters which are no longer supported. 
    // We will send 'set water' using the dry threshold, but impulse is kept disabled for now unless configured elsewhere.
    const d = Number(inDry) || 15;
    sendCloudCommand(`set water ${d} off 0`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🫔 Topf ${index} - Einstellungen`}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="font-bold mb-3">Live-Werte</h3>
          <div className="flex justify-between py-1 border-b border-white/5">
            <label className="text-gray-400 text-sm">Status</label>
            <div className="font-bold">{currentState !== undefined ? levelTxt[currentState] || '?' : '-'}</div>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <label className="text-gray-400 text-sm">ADC</label>
            <div className="font-bold">{currentRaw !== undefined ? currentRaw : '-'}</div>
          </div>
          <div className="flex justify-between py-1">
            <label className="text-gray-400 text-sm">Skala 1-15</label>
            <div className="font-bold">{toScale15(currentRaw)}</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="font-bold mb-2">🛠️ Kalibrierung</h3>
          <div className="text-xs text-gray-400 mb-4">
            Aktuellen Messwert als neuen Schwellenwert für alle Töpfe übernehmen.
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => handleTeach('wet')}
              className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 text-xs font-bold border border-blue-500/30 transition-colors"
            >
              💧 Nass setzen
            </button>
            <button 
              onClick={() => handleTeach('moist')}
              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 text-xs font-bold border border-emerald-500/30 transition-colors"
            >
              🌦️ Feucht setzen
            </button>
            <button 
              onClick={() => handleTeach('dry')}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30 text-xs font-bold border border-amber-500/30 transition-colors"
            >
              🌞 Trocken setzen
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="font-bold mb-3">📏 Schwellen (manuell)</h3>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <label className="text-sm w-20">Nass </label>
              <input 
                type="number" min="1" max="15" step="1" 
                value={inWet} onChange={e => setInWet(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20">Feucht ≤</label>
              <input 
                type="number" min="1" max="15" step="1" 
                value={inMoist} onChange={e => setInMoist(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20">Trocken &gt;</label>
              <input 
                type="number" min="1" max="15" step="1" 
                value={inDry} onChange={e => setInDry(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-emerald-500/50" 
              />
            </div>
          </div>

          <div className="mt-4">
            <button 
              onClick={handleThresholdsApply}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 text-sm font-bold border border-emerald-500/30 transition-colors w-full"
            >
              💾 Schwellen übernehmen
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
