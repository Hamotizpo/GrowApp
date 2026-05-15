import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';
import { DurationInput } from '../ui/DurationInput';

interface ActorModalProps {
  actorName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActorModal({ actorName, isOpen, onClose }: ActorModalProps) {
  const { state, sendCloudCommand, apiCall } = useIoTSync();
  const [activeTab, setActiveTab] = useState('control');

  // Forms State
  // Time
  const [timeVal, setTimeVal] = useState('12:00');
  const [timePwm, setTimePwm] = useState(50);
  const [timeDays, setTimeDays] = useState([true, true, true, true, true, true, true]); // So, Mo, Di, Mi, Do, Fr, Sa
  
  // Interval
  const [intervalOn, setIntervalOn] = useState('00:01:00');
  const [intervalOff, setIntervalOff] = useState('00:10:00');
  const [intervalStart, setIntervalStart] = useState('00:00');
  const [intervalEnd, setIntervalEnd] = useState('23:59');
  const [intervalDays, setIntervalDays] = useState([true, true, true, true, true, true, true]);

  // Impulse
  const [impulseDur, setImpulseDur] = useState('00:00:10');

  // Softstart
  const [softDur, setSoftDur] = useState('00:00:10');

  // Limits
  const [limitMin, setLimitMin] = useState(0);
  const [limitMax, setLimitMax] = useState(255);

  const [saveStatus, setSaveStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Control
  const [directPwm, setDirectPwm] = useState(0);

  const actorData = actorName ? state.actors[actorName] : null;
  const settings = actorData?.settings || {};

  const prevSettingsRef = React.useRef('');

  useEffect(() => {
    if (!isOpen) {
      prevSettingsRef.current = '';
      return;
    }

    const settingsStr = JSON.stringify(settings);
    if (settingsStr !== prevSettingsRef.current && actorData && Object.keys(settings).length > 0) {
      setDirectPwm(Math.round(((actorData.pwm || 0) / 255) * 100));
      setLimitMin(settings.minThreshold ?? 0);
      setLimitMax(settings.maxCap ?? 255);
      prevSettingsRef.current = settingsStr;
    }
  }, [isOpen, actorName, actorData, settings]);

  if (!actorName || !isOpen) return null;

  const humanizeActor = (name: string) => {
    const map: Record<string, string> = {
      heater: '🔥 Heizung',
      fan: '🌬️ Lüfter',
      humidifier: '💧 Luftbefeuchter',
      pump: '🚰 Pumpe',
      circulating_fan: '🌀 Umluft',
      dehumidifire: '🌫️ Luftentfeuchter',
      internal_cooling: '🧊 Schaltschranklüfter'
    };
    return map[name] || name;
  };

  const parseDurToSec = (hmms: string) => {
    const parts = hmms.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    return parts[0] || 0;
  };

  const getDaysStr = (daysArr: boolean[]) => {
    return daysArr.map(d => d ? '1' : '0').join('');
  };

  const handleDirectPwmChange = (val: number) => {
    setDirectPwm(val);
    const pwm255 = Math.round((val / 100) * 255);
    apiCall('/api/controlActor', { method: 'POST', body: `actor=${actorName}&state=${pwm255}` });
  };

  const TabBtn = ({ id, icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors border ${
        activeTab === id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const formatDays = (daysStr: string) => {
    const names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    return daysStr.split('').map((d, i) => d === '1' ? names[i] : null).filter(Boolean).join(', ');
  };

  const formatTime = (timeNum: number | string) => {
    const s = String(timeNum).padStart(4, '0');
    return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  };

  const handleApplyAction = (action: string, param?: any) => {
    apiCall('/api/resetActor', { 
      method: 'POST', 
      body: { actor: actorName, action, index: param } 
    });
  };

  const Input = ({ label, type = "text", ...props }: any) => {
    if (type === 'duration') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-[10px] text-muted-color font-bold uppercase tracking-widest">{label}</label>
          <DurationInput value={props.value} onChange={(val) => props.onChange({ target: { value: val } })} className="px-1" />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] text-muted-color font-bold uppercase tracking-widest">{label}</label>
        <input 
          type={type} 
          style={type === 'time' ? { colorScheme: 'dark' } : undefined}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
          {...props} 
        />
      </div>
    );
  };

  const Range = ({ label, val, ...props }: any) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[10px] text-muted-color font-bold uppercase tracking-widest flex justify-between">
        <span>{label}</span>
        <span className="text-emerald-400">{val}%</span>
      </label>
      <input 
        type="range" 
        className="accent-emerald-500 py-2 w-full"
        {...props} 
      />
    </div>
  );

  const DaysSelector = ({ days, setDays }: any) => (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button onClick={() => setDays([true,true,true,true,true,true,true])} className="px-2 py-1 text-xs bg-white/10 rounded">Alle</button>
        <button onClick={() => setDays([false,false,false,false,false,false,false])} className="px-2 py-1 text-xs bg-white/10 rounded">Keine</button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d, i) => (
          <button
            key={i}
            onClick={() => {
              const nd = [...days];
              nd[i] = !nd[i];
              setDays(nd);
            }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${days[i] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${humanizeActor(actorName)} - Einstellungen`}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar Tabs */}
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 shrink-0 custom-scrollbar">
          <TabBtn id="control" icon="🎛️" label="Ansteuern" />
          <TabBtn id="time" icon="⏱️" label="Zeit/PWM" />
          <TabBtn id="interval" icon="🔁" label="Intervall" />
          <TabBtn id="impulse" icon="⚡" label="Impuls" />
          <TabBtn id="soft" icon="🌅" label="Softstart" />
          <TabBtn id="limits" icon="↔" label="Limits" />
          <TabBtn id="reset" icon="♻️" label="Zurücksetzen" />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 min-h-[300px]">
          
          {activeTab === 'control' && (
            <div className="flex flex-col gap-4">
              <h4 className="font-bold">Direkte Steuerung</h4>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <label className="text-sm text-gray-400 mb-2 block">Verfügbare Leistung: {directPwm}%</label>
                <input 
                  type="range" min="0" max="100" 
                  value={directPwm}
                  onChange={(e) => handleDirectPwmChange(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <h4 className="font-bold flex items-center gap-2">
                  Zeitsteuerung: {settings.timeEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => apiCall('/api/resetActor', { 
                    method: 'POST', 
                    body: `actor=${actorName}&action=${settings.timeEnabled ? 'dis_time' : 'en_time'}` 
                  })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.timeEnabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
                >
                  {settings.timeEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-lg">
                <div className="grid grid-cols-2 gap-5">
                  <Input label="Zeit (HH:MM)" type="time" value={timeVal} onChange={(e: any) => setTimeVal(e.target.value)} />
                  <Range label="PWM" val={timePwm} min="0" max="100" value={timePwm} onChange={(e: any) => setTimePwm(Number(e.target.value))} />
                </div>
                <DaysSelector days={timeDays} setDays={setTimeDays} />
                <button 
                  onClick={() => apiCall('/api/addTimeEntry', { 
                    method: 'POST', 
                    body: `actor=${actorName}&pwm=${Math.round((timePwm/100)*255)}&time=${timeVal.replace(':', '')}&days=${getDaysStr(timeDays)}` 
                  })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  ➕ Neues Zeit-Programm Hinzufügen
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                {(settings.timeEntries || []).map((ent: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4 flex justify-between items-center text-sm shadow-xl">
                    <div className="flex flex-col gap-1">
                      <div className="text-white text-base">Zeit: <strong className="text-emerald-400">{formatTime(ent.time)}</strong> &bull; PWM: <strong className="text-emerald-400">{ent.pwmValue ?? ent.pwm}</strong></div>
                      <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Tage: {formatDays(ent.weekdays ?? ent.days)}</div>
                    </div>
                    <button onClick={() => handleApplyAction('del_time', idx)} className="text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-lg font-bold transition-colors">Löschen</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interval' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <h4 className="font-bold flex items-center gap-2">
                  Intervall: {settings.intervalEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => apiCall('/api/resetActor', { 
                    method: 'POST', 
                    body: `actor=${actorName}&action=${settings.intervalEnabled ? 'dis_inter' : 'en_inter'}` 
                  })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.intervalEnabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
                >
                  {settings.intervalEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-lg">
                <div className="grid grid-cols-2 gap-5">
                  <Input label="An-Phase (HH:MM:SS)" type="duration" value={intervalOn} onChange={(e: any) => setIntervalOn(e.target.value)} />
                  <Input label="Aus-Phase (HH:MM:SS)" type="duration" value={intervalOff} onChange={(e: any) => setIntervalOff(e.target.value)} />
                  <Input label="Aktiv ab (HH:MM)" type="time" value={intervalStart} onChange={(e: any) => setIntervalStart(e.target.value)} />
                  <Input label="Aktiv bis (HH:MM)" type="time" value={intervalEnd} onChange={(e: any) => setIntervalEnd(e.target.value)} />
                </div>
                <DaysSelector days={intervalDays} setDays={setIntervalDays} />
                <button 
                  onClick={() => apiCall('/api/setInterval', { 
                    method: 'POST', 
                    body: `actor=${actorName}&on=${parseDurToSec(intervalOn)}s&off=${parseDurToSec(intervalOff)}s&start=${intervalStart.replace(':', '')}&end=${intervalEnd.replace(':', '')}&days=${getDaysStr(intervalDays)}` 
                  })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  💾 Setzen
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                {(settings.intervalEntries || []).map((ent: any, idx: number) => (
                  <div key={idx} className="bg-black/30 border border-white/10 rounded-lg p-3 flex justify-between items-center text-sm">
                    <div>
                      <div>Von <strong>{formatTime(ent.startTime ?? ent.start)}</strong> bis <strong>{formatTime(ent.endTime ?? ent.end)}</strong></div>
                      <div>An: {ent.onDuration ?? ent.on}s | Aus: {ent.offDuration ?? ent.off}s</div>
                      <div className="text-xs text-gray-400">Tage: {formatDays(ent.weekdays ?? ent.days)}</div>
                    </div>
                    <button onClick={() => handleApplyAction('del_inter', idx)} className="text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">Löschen</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'impulse' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <h4 className="font-bold flex items-center gap-2">
                  Impuls: {settings.impulseEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => apiCall('/api/resetActor', { 
                    method: 'POST', 
                    body: `actor=${actorName}&action=${settings.impulseEnabled ? 'dis_impulse' : 'en_impulse'}` 
                  })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.impulseEnabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
                >
                  {settings.impulseEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-lg">
                <Input label="Impulsdauer (HH:MM:SS)" type="duration" value={impulseDur} onChange={(e: any) => setImpulseDur(e.target.value)} />
                <button 
                  onClick={() => apiCall('/api/addImpulse', { method: 'POST', body: `actor=${actorName}&duration=${parseDurToSec(impulseDur)}s` })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  💾 Setzen
                </button>
              </div>
              {settings.impulseDuration !== undefined && (
                <div className="text-gray-400 text-sm">
                  Aktuelle Dauer: {settings.impulseDuration} s
                </div>
              )}
            </div>
          )}

          {activeTab === 'soft' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <h4 className="font-bold flex items-center gap-2">
                  Softstart: {settings.softStartEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => apiCall('/api/setSoftStart', { 
                    method: 'POST', 
                    body: `actor=${actorName}&enable=${settings.softStartEnabled ? '0' : '1'}&duration=10s` 
                  })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.softStartEnabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
                >
                  {settings.softStartEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-lg">
                <Input label="Dauer (HH:MM:SS)" type="duration" value={softDur} onChange={(e: any) => setSoftDur(e.target.value)} />
                <button 
                  onClick={() => apiCall('/api/setSoftStart', { method: 'POST', body: `actor=${actorName}&enable=1&duration=${parseDurToSec(softDur)}s` })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  💾 Setzen
                </button>
              </div>
              {settings.softStartDuration !== undefined && (
                <div className="text-gray-400 text-sm">
                  Aktuelle Dauer: {Math.floor((Number(settings.softStartDuration) || 0) / 1000)} s
                </div>
              )}
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-lg">
                <Input label="Min-Schwelle (0-255)" type="number" min="0" max="255" value={limitMin} onChange={(e: any) => setLimitMin(Number(e.target.value))} />
                <Input label="Max-Kappung (0-255)" type="number" min="0" max="255" value={limitMax} onChange={(e: any) => setLimitMax(Number(e.target.value))} />
                
                <p className="text-xs text-gray-400">
                  Beim Einschalten wird die Min-Schwelle gesetzt, Softstart fährt dann linear zum Max-Cap.
                </p>

                {saveStatus && (
                  <div className={`p-3 rounded-lg text-xs font-bold text-center ${saveStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {saveStatus.message}
                  </div>
                )}
                
                <button 
                  onClick={async () => {
                    try {
                      await apiCall('/api/setActorLimits', { 
                        method: 'POST', 
                        body: { 
                          actor: actorName, 
                          min_threshold: Number(limitMin), 
                          max_cap: Number(limitMax) 
                        } 
                      });
                      setSaveStatus({ message: `Limits für ${humanizeActor(actorName || '')} erfolgreich gesendet!`, type: 'success' });
                      setTimeout(() => setSaveStatus(null), 3000);
                    } catch (err: any) {
                      setSaveStatus({ message: `Fehler: ${err.message}`, type: 'error' });
                      setTimeout(() => setSaveStatus(null), 3000);
                    }
                  }}
                  className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl px-6 py-3 w-full transition-colors font-bold text-sm"
                >
                  💾 Limits Übernehmen
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-gray-400 mb-4 text-center">Hier werden alle Zeit-, Intervall- und Impulssteuerungen für diesen Aktor gelöscht.</p>
              <button 
                onClick={() => {
                  if (confirm('Sicher, dass alle Funktionen gelöscht werden sollen?')) {
                    apiCall('/api/resetActor', { method: 'POST', body: `actor=${actorName}&action=clear` });
                  }
                }}
                className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                🗑️ Alle Funktionen löschen
              </button>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
