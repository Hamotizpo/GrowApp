import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';

interface ActorModalProps {
  actorName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActorModal({ actorName, isOpen, onClose }: ActorModalProps) {
  const { state, sendCloudCommand } = useIoTSync();
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

  // Control
  const [directPwm, setDirectPwm] = useState(0);

  const actorData = actorName ? state.actors[actorName] : null;
  const settings = actorData?.settings || {};

  useEffect(() => {
    if (isOpen && actorData) {
      setDirectPwm(Math.round(((actorData.pwm || 0) / 255) * 100));
      setLimitMin(settings.minThreshold ?? 0);
      setLimitMax(settings.maxCap ?? 255);
    }
  }, [isOpen, actorName]);

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

  const exec = (cmd: string) => {
    sendCloudCommand(cmd);
  };

  const handleDirectPwmChange = (val: number) => {
    setDirectPwm(val);
    const pwm255 = Math.round((val / 100) * 255);
    exec(`set pwm ${actorName} ${pwm255}`);
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
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <h4 className="font-bold flex items-center gap-2">
                  Zeitsteuerung: {settings.timeEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => exec(settings.timeEnabled ? `cont ${actorName} dis_time` : `cont ${actorName} en_time`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.timeEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                >
                  {settings.timeEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Zeit (HH:MM)</label>
                    <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">PWM (%) - {timePwm}%</label>
                    <input type="range" min="0" max="100" value={timePwm} onChange={e => setTimePwm(Number(e.target.value))} className="accent-emerald-500 py-2" />
                  </div>
                </div>
                <DaysSelector days={timeDays} setDays={setTimeDays} />
                <button 
                  onClick={() => {
                    const daysBits = getDaysStr(timeDays);
                    if (daysBits === '0000000') return alert('Tage auswählen');
                    const t = timeVal.replace(':', '');
                    const p = Math.round((timePwm/100)*255);
                    exec(`set time ${actorName} ${p} ${t} ${daysBits}`);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  ➕ Hinzufügen
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                {(settings.timeEntries || []).map((ent: any, idx: number) => (
                  <div key={idx} className="bg-black/30 border border-white/10 rounded-lg p-3 flex justify-between items-center text-sm">
                    <div>
                      <div>Zeit: <strong>{formatTime(ent.time)}</strong> | PWM: {ent.pwmValue ?? ent.pwm}</div>
                      <div className="text-xs text-gray-400">Tage: {formatDays(ent.weekdays ?? ent.days)}</div>
                    </div>
                    <button onClick={() => exec(`cont ${actorName} del_time ${idx}`)} className="text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">Löschen</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interval' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <h4 className="font-bold flex items-center gap-2">
                  Intervall: {settings.intervalEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => exec(settings.intervalEnabled ? `cont ${actorName} dis_inter` : `cont ${actorName} en_inter`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.intervalEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                >
                  {settings.intervalEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">An-Phase (d:h:m:s)</label>
                    <input type="time" step="1" value={intervalOn} onChange={e => setIntervalOn(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Aus-Phase (d:h:m:s)</label>
                    <input type="time" step="1" value={intervalOff} onChange={e => setIntervalOff(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Aktiv ab (HH:MM)</label>
                    <input type="time" value={intervalStart} onChange={e => setIntervalStart(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-bold uppercase">Aktiv bis (HH:MM)</label>
                    <input type="time" value={intervalEnd} onChange={e => setIntervalEnd(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                  </div>
                </div>
                <DaysSelector days={intervalDays} setDays={setIntervalDays} />
                <button 
                  onClick={() => {
                    const daysBits = getDaysStr(intervalDays);
                    if (daysBits === '0000000') return alert('Tage auswählen');
                    const onS = parseDurToSec(intervalOn);
                    const offS = parseDurToSec(intervalOff);
                    const start = intervalStart.replace(':', '');
                    const end = intervalEnd.replace(':', '');
                    exec(`set inter ${actorName} ${onS}s ${offS}s ${start} ${end} ${daysBits}`);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition-colors"
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
                    <button onClick={() => exec(`cont ${actorName} del_inter ${idx}`)} className="text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">Löschen</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'impulse' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <h4 className="font-bold flex items-center gap-2">
                  Impuls: {settings.impulseEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => exec(settings.impulseEnabled ? `cont ${actorName} dis_impulse` : `cont ${actorName} en_impulse`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.impulseEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                >
                  {settings.impulseEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-bold uppercase">Impulsdauer (HH:MM:SS)</label>
                  <input type="time" step="1" value={impulseDur} onChange={e => setImpulseDur(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                </div>
                <button 
                  onClick={() => exec(`set impuls ${actorName} ${parseDurToSec(impulseDur)}s`)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  ➕ Setzen
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
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <h4 className="font-bold flex items-center gap-2">
                  Softstart: {settings.softStartEnabled ? <span className="text-emerald-400">AKTIV</span> : <span className="text-gray-400">AUS</span>}
                </h4>
                <button 
                  onClick={() => exec(`set soft ${actorName} ${settings.softStartEnabled ? 'off' : 'on'} 10s`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.softStartEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                >
                  {settings.softStartEnabled ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-bold uppercase">Dauer (HH:MM:SS)</label>
                  <input type="time" step="1" value={softDur} onChange={e => setSoftDur(e.target.value)} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                </div>
                <button 
                  onClick={() => exec(`set soft ${actorName} on ${parseDurToSec(softDur)}s`)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-sm transition-colors"
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
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-bold uppercase">Min-Schwelle (0-255)</label>
                  <input type="number" min="0" max="255" value={limitMin} onChange={e => setLimitMin(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-bold uppercase">Max-Kappung (0-255)</label>
                  <input type="number" min="0" max="255" value={limitMax} onChange={e => setLimitMax(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none" />
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  Beim Einschalten wird die Min-Schwelle gesetzt, Softstart fährt dann linear zum Max-Cap.
                </p>

                <button 
                  onClick={() => exec(`set limits ${actorName} ${limitMin} ${limitMax}`)}
                  className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  💾 Setzen
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
                    exec(`cont ${actorName} clear`);
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
