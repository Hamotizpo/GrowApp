import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';
import { buildLightSeries, minutesFromClock, convertPwmToIntensity } from '../../lib/lightChartUtils';
import LightIntensityChart from '../LightIntensityChart';
import { DurationInput } from '../ui/DurationInput';
import { formatDurationMs } from '../../lib/utils';


function timeToHHMM(time: number | string | undefined | null) {
  if (time === null || time === undefined) return '00:00';
  const str = String(time).replace(':', '').padStart(4, '0');
  return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
}

function parseDurationToMs(str: string) {
  if (!str) return 0;
  const parts = String(str).split(':').map(p => parseInt(p || '0', 10) || 0);
  if (parts.length === 3) return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000;
  if (parts.length === 2) return ((parts[0] * 3600) + (parts[1] * 60)) * 1000;
  return (parts[0] || 0) * 1000;
}

function msToHHMMSS(ms: number) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface LightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LightModal({ isOpen, onClose }: LightModalProps) {
  const { state, sendCloudCommand, apiCall } = useIoTSync();
  
  const lightWhiteConfig = state.actors?.light_white?.settings || {};
  const lightWhiteLive = state.actors?.light_white || {};
  const lightWhite = { ...lightWhiteConfig, ...lightWhiteLive };

  const lightUVConfig = state.actors?.light_uv?.settings || {};
  const lightUVLive = state.actors?.light_uv || {};
  const lightUV = { ...lightUVConfig, ...lightUVLive };

  const lightIRConfig = state.actors?.light_ir?.settings || {};
  const lightIRLive = state.actors?.light_ir || {};
  const lightIR = { ...lightIRConfig, ...lightIRLive };
  const env = state.system?.envConfig || {};

  // Form State
  const [dayStart, setDayStart] = useState('06:00');
  const [nightStart, setNightStart] = useState('18:00');
  
  const [wSsEn, setWSsEn] = useState(false);
  const [wSsDur, setWSsDur] = useState('00:10:00');

  const [uvOn, setUvOn] = useState('00:00');
  const [uvOff, setUvOff] = useState('00:00');
  
  const [irOn, setIrOn] = useState('00:00');
  const [irOff, setIrOff] = useState('00:00');

  const [showDirect, setShowDirect] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Direct interaction local overrides (for fluid slider)
  const [localPwmW, setLocalPwmW] = useState<number | null>(null);

  const [minWhite, setMinWhite] = useState<number | ''>('');
  const [maxWhite, setMaxWhite] = useState<number | ''>('');

  // 1. Initialise form state when modal opens or when data arrives
  const prevEnvRef = useRef('');
  const prevWhiteRef = useRef('');
  const prevUvRef = useRef('');
  const prevIrRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      prevEnvRef.current = '';
      prevWhiteRef.current = '';
      prevUvRef.current = '';
      prevIrRef.current = '';
      return;
    }

    const envStr = JSON.stringify(env);
    if (envStr !== prevEnvRef.current && Object.keys(env).length > 0) {
      const dStart = env.dayStartTime ?? env.dStart ?? '0600';
      const nStart = env.nightStartTime ?? env.nStart ?? '1800';
      setDayStart(timeToHHMM(dStart));
      setNightStart(timeToHHMM(nStart));
      prevEnvRef.current = envStr;
    }

    const whiteStr = JSON.stringify(lightWhiteConfig);
    if (whiteStr !== prevWhiteRef.current && Object.keys(lightWhiteConfig).length > 0) {
      setWSsEn(!!lightWhiteConfig.softStartEnabled);
      setWSsDur(msToHHMMSS(Number(lightWhiteConfig.softStartDuration) || 0));
      setMinWhite(lightWhiteConfig.minThreshold ?? 0);
      setMaxWhite(lightWhiteConfig.maxCap ?? 255);
      setLocalPwmW(null); // Reset local slider override
      prevWhiteRef.current = whiteStr;
    }

    const extractOnOff = (actorConfig: any, isLow = false) => {
      let onT = '00:00'; let offT = '00:00';
      const ents = Array.isArray(actorConfig.timeEntries) ? actorConfig.timeEntries : [];
      const sorted = ents
        .map((entry: any) => ({ entry, minutes: minutesFromClock(entry?.time) }))
        .filter((item: any) => Number.isFinite(item.minutes))
        .sort((a: any, b: any) => a.minutes! - b.minutes!);
      
      let onMinutes: number | null = null;
      let offMinutes: number | null = null;
      for (const { entry, minutes } of sorted) {
        const raw = entry.pwmValue ?? entry.pwm ?? (isLow ? 255 : 0);
        const intensity = convertPwmToIntensity(isLow ? 'light_ir' : 'light_white', raw);
        if (intensity > 0 && onMinutes === null) {
          onMinutes = minutes;
        } else if (intensity <= 0 && onMinutes !== null && offMinutes === null && minutes !== onMinutes) {
          offMinutes = minutes;
        }
      }
      if (onMinutes !== null) onT = timeToHHMM(`${String(Math.floor(onMinutes/60)).padStart(2, '0')}${String(Math.floor(onMinutes%60)).padStart(2, '0')}`);
      if (offMinutes !== null) offT = timeToHHMM(`${String(Math.floor(offMinutes/60)).padStart(2, '0')}${String(Math.floor(offMinutes%60)).padStart(2, '0')}`);
      return { onT, offT };
    };

    const uvStr = JSON.stringify(lightUVConfig);
    if (uvStr !== prevUvRef.current && Object.keys(lightUVConfig).length > 0) {
      const uvTimes = extractOnOff(lightUVConfig, true);
      setUvOn(uvTimes.onT); setUvOff(uvTimes.offT);
      prevUvRef.current = uvStr;
    }

    const irStr = JSON.stringify(lightIRConfig);
    if (irStr !== prevIrRef.current && Object.keys(lightIRConfig).length > 0) {
      const irTimes = extractOnOff(lightIRConfig, true);
      setIrOn(irTimes.onT); setIrOff(irTimes.offT);
      prevIrRef.current = irStr;
    }

  }, [isOpen, env, lightWhiteConfig, lightUVConfig, lightIRConfig]); 

  // 2. Computed Preview Data
  const previewEnv = React.useMemo(() => {
    return {
      ...env,
      dayStartTime: dayStart.replace(':', ''),
      nightStartTime: nightStart.replace(':', ''),
    };
  }, [env, dayStart, nightStart]);

  const previewActors = React.useMemo(() => {
    const buildEntries = (onT: string, offT: string, isLow: boolean) => {
      const onM = minutesFromClock(onT);
      const offM = minutesFromClock(offT);
      if (!Number.isFinite(onM) || !Number.isFinite(offM) || onM === offM) {
        return [];
      }
      const padM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;
      const onP = isLow ? 0 : 255;
      const offP = isLow ? 255 : 0;
      return [
        { time: padM(onM!), pwmValue: onP },
        { time: padM(offM!), pwmValue: offP }
      ];
    };

    const totalSec = wSsEn && wSsDur ? Math.floor(parseDurationToMs(wSsDur) / 1000) : 0;
    const durMs = totalSec * 1000;

    return {
      ...state.actors,
      light_white: {
        ...state.actors?.light_white,
        pwm: localPwmW !== null ? localPwmW : (state.actors?.light_white?.pwm ?? 0),
        settings: {
          ...lightWhiteConfig,
          softStartEnabled: wSsEn && totalSec > 0 ? 1 : 0,
          softStartDuration: durMs,
          minThreshold: minWhite === '' ? 0 : minWhite,
          maxCap: maxWhite === '' ? 255 : maxWhite,
        }
      },
      light_uv: {
        ...state.actors?.light_uv,
        settings: {
          ...lightUVConfig,
          timeEntries: buildEntries(uvOn, uvOff, true),
        }
      },
      light_ir: {
        ...state.actors?.light_ir,
        settings: {
          ...lightIRConfig,
          timeEntries: buildEntries(irOn, irOff, true),
        }
      }
    };
  }, [state.actors, wSsEn, wSsDur, minWhite, maxWhite, localPwmW, uvOn, uvOff, irOn, irOff, lightWhiteConfig, lightUVConfig, lightIRConfig]);

  // Duration Helper
  const calcDur = (onT: string, offT: string) => {
    const onM = minutesFromClock(onT);
    const offM = minutesFromClock(offT);
    if (!Number.isFinite(onM) || !Number.isFinite(offM) || onM === offM) return '';
    const durM = (offM! - onM! + 1440) % 1440;
    if (durM <= 0) return '';
    return `Dauer ${Math.floor(durM / 60)}:${String(durM % 60).padStart(2, '0')} h`;
  };

  const dsM = minutesFromClock(dayStart);
  const nsM = minutesFromClock(nightStart);
  const dayDurM = (Number.isFinite(dsM) && Number.isFinite(nsM)) ? 
    (dsM! < nsM! ? (nsM! - dsM!) : (1440 - (dsM! - nsM!))) : 0;

  // Actions
  const handleSave = async () => {
    const d = dayStart.replace(':', '');
    const n = nightStart.replace(':', '');
    
    // Day/Night Start
    await apiCall('/api/setDayStart', { method: 'POST', body: `time=${d}` });
    await apiCall('/api/setNightStart', { method: 'POST', body: `time=${n}` });

    // SoftStart for White Light
    const totalSec = wSsEn && wSsDur ? Math.floor(parseDurationToMs(wSsDur) / 1000) : 0;
    const durStr = `${totalSec}s`;
    const ssEnStr = (wSsEn && totalSec > 0) ? '1' : '0';
    
    await apiCall('/api/setSoftStart', { 
      method: 'POST', 
      body: `actor=light_white&enable=${ssEnStr}&duration=${durStr}`
    });

    const applyPlan = async (actor: string, onT: string, offT: string, isLow: boolean) => {
      let onM = minutesFromClock(onT);
      let offM = minutesFromClock(offT);
      if (!Number.isFinite(onM) || !Number.isFinite(offM) || onM === offM) {
        await apiCall('/api/resetActor', { method: 'POST', body: `actor=${actor}&action=clear` });
        return;
      }
      const padM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;
      
      const onP = isLow ? 0 : 255;
      const offP = isLow ? 255 : 0;
      
      // Reset first
      await apiCall('/api/resetActor', { method: 'POST', body: `actor=${actor}&action=clear` });
      
      // Add entries
      await apiCall('/api/addTimeEntry', { 
        method: 'POST', 
        body: `actor=${actor}&time=${padM(onM!)}&pwm=${onP}&days=1111111` 
      });
      await apiCall('/api/addTimeEntry', { 
        method: 'POST', 
        body: `actor=${actor}&time=${padM(offM!)}&pwm=${offP}&days=1111111` 
      });
    };

    await applyPlan('light_uv', uvOn, uvOff, true);
    await applyPlan('light_ir', irOn, irOff, true);

    onClose();
  };

  const applyDirectToggle = (actor: string, isOn: boolean, isLow = false) => {
    let pwmTarget = isLow ? 0 : 255; // default full on
    if (!isOn) pwmTarget = isLow ? 255 : 0;
    
    apiCall('/api/controlActor', { method: 'POST', body: { actor, state: pwmTarget } });
    
    if (actor === 'light_white') setLocalPwmW(pwmTarget);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💡 Licht & Tag/Nacht" maxWidth="600px">
      <div className="flex flex-col gap-4 text-white">
        
        {/* Chart */}
        <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden p-2 h-48">
          <LightIntensityChart env={previewEnv} actors={previewActors} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2">
            <label className="block text-[10px] text-muted-color font-bold tracking-widest uppercase mb-1">🌅 Tag Start</label>
            <input type="time" step="60" style={{ colorScheme: 'dark' }} value={dayStart} onChange={e => setDayStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm md:text-base outline-none focus:border-emerald-500/50" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-2">
            <label className="block text-[10px] text-muted-color font-bold tracking-widest uppercase mb-1">🌇 Nacht Start</label>
            <input type="time" step="60" style={{ colorScheme: 'dark' }} value={nightStart} onChange={e => setNightStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm md:text-base outline-none focus:border-emerald-500/50" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-2 col-span-2 sm:col-span-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] text-muted-color font-bold tracking-widest uppercase">⏳ Softstart Weiß</label>
              {lightWhiteLive.ss && lightWhiteLive.ss_rem !== undefined && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                  {formatDurationMs(lightWhiteLive.ss_rem)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={wSsEn} onChange={e => setWSsEn(e.target.checked)} className="w-5 h-5 rounded border-white/10 bg-black/40 accent-emerald-500 flex-shrink-0 cursor-pointer" />
              <DurationInput value={wSsDur} disabled={!wSsEn} onChange={setWSsDur} className="flex-1" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-[#e11d48]/10 border border-[#e11d48]/30 rounded-lg p-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-[#e11d48] font-bold tracking-widest uppercase">🌇 IR Plan</label>
              <div className="text-[10px] text-[#e11d48] font-mono">{calcDur(irOn, irOff)}</div>
            </div>
            <div className="flex items-center gap-2">
               <input type="time" step="60" style={{ colorScheme: 'dark' }} value={irOn} onChange={e => setIrOn(e.target.value)} className="flex-1 min-w-[70px] bg-black/40 border border-[#e11d48]/30 rounded p-2 text-sm md:text-base outline-none focus:border-[#e11d48]" />
               <span className="text-muted-color text-xs">-</span>
               <input type="time" step="60" style={{ colorScheme: 'dark' }} value={irOff} onChange={e => setIrOff(e.target.value)} className="flex-1 min-w-[70px] bg-black/40 border border-[#e11d48]/30 rounded p-2 text-sm md:text-base outline-none focus:border-[#e11d48]" />
            </div>
          </div>

          <div className="flex-1 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-lg p-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-[#7c3aed] font-bold tracking-widest uppercase">🌌 UV Plan</label>
              <div className="text-[10px] text-[#7c3aed] font-mono">{calcDur(uvOn, uvOff)}</div>
            </div>
            <div className="flex items-center gap-2">
               <input type="time" step="60" style={{ colorScheme: 'dark' }} value={uvOn} onChange={e => setUvOn(e.target.value)} className="flex-1 min-w-[70px] bg-black/40 border border-[#7c3aed]/30 rounded p-2 text-sm md:text-base outline-none focus:border-[#7c3aed]" />
               <span className="text-muted-color text-xs">-</span>
               <input type="time" step="60" style={{ colorScheme: 'dark' }} value={uvOff} onChange={e => setUvOff(e.target.value)} className="flex-1 min-w-[70px] bg-black/40 border border-[#7c3aed]/30 rounded p-2 text-sm md:text-base outline-none focus:border-[#7c3aed]" />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-emerald-400 font-semibold mb-2">
          Tagdauer: {dayDurM > 0 ? `${(dayDurM / 60).toFixed(1)} h` : '--'}
        </div>

        <div className="flex items-center gap-2 mt-2 pt-4 border-t border-white/5">
          <input type="checkbox" id="t-dir" checked={showDirect} onChange={e => setShowDirect(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-black/40 accent-white cursor-pointer" />
          <label htmlFor="t-dir" className="text-xs text-muted-color cursor-pointer font-bold uppercase tracking-wider">🎛️ Manuelle Direktsteuerung</label>
        </div>

        {showDirect && (
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-3">
             <div className="flex items-center gap-3">
              <label className="min-w-[40px] text-xs font-semibold text-white">Weiß</label>
              <input 
                type="checkbox" 
                checked={lightWhite?.on} 
                onChange={(e) => applyDirectToggle('light_white', e.target.checked, false)}
                className="w-5 h-5 rounded border-white/10 bg-black/40 accent-emerald-500 cursor-pointer"
              />
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={localPwmW !== null ? localPwmW : (lightWhite?.pwm ?? 0)} 
                onChange={(e) => {
                  setLocalPwmW(Number(e.target.value));
                }}
                onMouseUp={(e) => {
                  apiCall('/api/controlActor', { method: 'POST', body: { actor: 'light_white', state: Number(e.currentTarget.value) } });
                }}
                onTouchEnd={(e) => {
                  apiCall('/api/controlActor', { method: 'POST', body: { actor: 'light_white', state: Number(e.currentTarget.value) } });
                }}
                className="flex-1 cursor-pointer"
              />
              <span className="text-xs text-muted-color w-8 text-right font-mono">{localPwmW !== null ? localPwmW : (lightWhite?.pwm ?? 0)}</span>
            </div>

            <div className="flex items-end gap-3 mt-1 pb-2 border-b border-white/5">
              <div className="flex-1">
                <label className="block text-[10px] text-muted-color font-bold tracking-widest uppercase mb-1">Min. (0-255)</label>
                <input 
                  type="number" min="0" max="255" step="1" value={minWhite} onChange={e => setMinWhite(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded p-1 text-xs text-white outline-none focus:border-emerald-500/50" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-muted-color font-bold tracking-widest uppercase mb-1">Max. (0-255)</label>
                <input 
                  type="number" min="0" max="255" step="1" value={maxWhite} onChange={e => setMaxWhite(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded p-1 text-xs text-white outline-none focus:border-emerald-500/50" />
              </div>
              <button 
                onClick={async () => {
                  if (minWhite !== '' && maxWhite !== '') {
                    try {
                      await apiCall('/api/setActorLimits', { 
                        method: 'POST', 
                        body: { actor: 'light_white', min_threshold: Number(minWhite), max_cap: Number(maxWhite) } 
                      });
                      setSaveStatus({ message: `Limits erfolgreich gesendet! (Min=${minWhite}, Max=${maxWhite})`, type: 'success' });
                      setTimeout(() => setSaveStatus(null), 3000);
                    } catch (err: any) {
                      setSaveStatus({ message: `Fehler beim Senden: ${err.message}`, type: 'error' });
                      setTimeout(() => setSaveStatus(null), 3000);
                    }
                  } else {
                    setSaveStatus({ message: "Bitte geben Sie gültige Werte für Min und Max ein.", type: 'error' });
                    setTimeout(() => setSaveStatus(null), 3000);
                  }
                }}
                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded border border-emerald-500/30 text-xs font-bold transition-colors h-[26px]"
              >
                Anwenden
              </button>
            </div>

            <div className="flex gap-4 items-center mt-2">
              <label className="min-w-[40px] text-xs font-semibold text-red-500">IR</label>
              <input type="checkbox" checked={lightIR?.on} onChange={(e) => applyDirectToggle('light_ir', e.target.checked, true)} className="w-5 h-5 rounded border-white/10 bg-black/40 accent-red-500 cursor-pointer" />
              
              <label className="min-w-[40px] text-xs font-semibold text-purple-500 ml-4">UV</label>
              <input type="checkbox" checked={lightUV?.on} onChange={(e) => applyDirectToggle('light_uv', e.target.checked, true)} className="w-5 h-5 rounded border-white/10 bg-black/40 accent-purple-500 cursor-pointer" />
            </div>
            
            {saveStatus && (
              <div className={`mt-3 p-2 rounded text-xs font-bold ${saveStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {saveStatus.message}
              </div>
            )}
            
            <div className="text-[10px] text-muted-color mt-3 italic leading-snug">
              Achtung: Manuelle Schaltungen werden durch den Zeitplan beim nächsten Tick überschrieben. Limits werden nach "Anwenden" am Gerät gesichert.
            </div>
          </div>
        )}

      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Abbrechen</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 hover:text-white transition-all">Speichern</button>
      </div>
    </Modal>
  );
}
