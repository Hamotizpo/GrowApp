import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useIoTSync } from '../../context/IoTSyncContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface LightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LightModal({ isOpen, onClose }: LightModalProps) {
  const { state, sendCloudCommand } = useIoTSync();
  const lightWhite = state.actors?.light_white?.settings || state.actors?.light_white || {};
  const lightUV = state.actors?.light_uv?.settings || state.actors?.light_uv || {};
  const lightIR = state.actors?.light_ir?.settings || state.actors?.light_ir || {};
  const env = state.system?.envConfig || {};

  const [durWhite, setDurWhite] = useState<number | ''>('');
  const [durUV, setDurUV] = useState<number | ''>('');
  const [durIR, setDurIR] = useState<number | ''>('');
  
  useEffect(() => {
    if (isOpen) {
      setDurWhite(lightWhite.duration ? Math.round(lightWhite.duration / 60) : 18);
      setDurUV(lightUV.duration ? Math.round(lightUV.duration / 60) : 4);
      setDurIR(lightIR.duration ? Math.round(lightIR.duration / 60) : 18);
    }
  }, [isOpen, lightWhite, lightUV, lightIR]);

  const handleSave = () => {
    if (durWhite !== '') sendCloudCommand(`set force light_white_dur ${Number(durWhite) * 60}`);
    if (durUV !== '') sendCloudCommand(`set force light_uv_dur ${Number(durUV) * 60}`);
    if (durIR !== '') sendCloudCommand(`set force light_ir_dur ${Number(durIR) * 60}`);
    onClose();
  };

  const manualToggle = (actor: string, force: number) => {
    sendCloudCommand(`set force ${actor} ${force}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💡 Licht-Steuerung"
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
            Schließen
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-sm font-bold">
            💾 Zyklus Speichern
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">

        <div className="h-48 w-full bg-black/20 rounded-xl p-3 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            {(() => {
              const startH = parseInt((env.dayStartTime ?? env.dStart)?.toString().slice(0, 2) || '6', 10);
              const wDur = typeof durWhite === 'number' ? durWhite : (lightWhite?.duration ? Math.round(lightWhite.duration / 60) : 18);
              const uvDur = typeof durUV === 'number' ? durUV : (lightUV?.duration ? Math.round(lightUV.duration / 60) : 4);
              const irDur = typeof durIR === 'number' ? durIR : (lightIR?.duration ? Math.round(lightIR.duration / 60) : 18);
              
              const endWhite = (startH + wDur) % 24;
              const uvStart = (startH + Math.floor(wDur / 2) - Math.floor(uvDur / 2)) % 24;
              const uvEnd = (uvStart + uvDur) % 24;
              
              // Helper to check if hour is in range
              const inRange = (h: number, s: number, e: number) => {
                if (s < e) return h >= s && h <= e;
                return h >= s || h <= e;
              };

              const chartData = Array.from({ length: 25 }).map((_, i) => {
                const hour = i;
                
                // White light with softstart (ramp up over 1 hr, ramp down over 1 hr)
                let whiteVal = 0;
                if (inRange(hour, startH, endWhite)) {
                  if (hour === startH) whiteVal = 0.5; // Softstart ramping up
                  else if (hour === endWhite) whiteVal = 0.5; // Softstart ramping down
                  else whiteVal = 1;
                }
                
                // UV light during peak
                const uvVal = inRange(hour, uvStart, uvEnd) && uvDur > 0 ? 0.3 : 0;
                
                // IR light (runs same as white ideally, or ends slightly later)
                let irVal = 0;
                if (inRange(hour, startH, (startH + irDur) % 24) && irDur > 0) {
                    irVal = 0.4;
                }

                return { hour, white: whiteVal, uv: uvVal, ir: irVal };
              });

              return (
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <defs>
                    <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(tick) => `${tick}h`} 
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickMargin={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide domain={[0, 1.2]} />
                  <Tooltip 
                    labelFormatter={(label) => `${label}:00 Uhr`}
                    contentStyle={{ backgroundColor: '#0d2d3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" name="Full Spec / White (inkl. Softstart)" dataKey="white" stroke="#fbbf24" fillOpacity={1} fill="url(#colorWhite)" isAnimationActive={false} />
                  <Area type="stepAfter" name="UV Boost" dataKey="uv" stroke="#a855f7" fillOpacity={1} fill="url(#colorUV)" isAnimationActive={false} />
                  <Area type="stepAfter" name="IR Boost" dataKey="ir" stroke="#ef4444" fillOpacity={1} fill="url(#colorIR)" isAnimationActive={false} />
                </AreaChart>
              );
            })()}
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ActorControl actorName="light_white" label="White (Full Spectrum)" stateData={lightWhite} manualToggle={manualToggle} duration={durWhite} setDuration={setDurWhite} />
          <ActorControl actorName="light_ir" label="Infrared (IR)" stateData={lightIR} manualToggle={manualToggle} duration={durIR} setDuration={setDurIR} />
          <ActorControl actorName="light_uv" label="Ultraviolet (UV)" stateData={lightUV} manualToggle={manualToggle} duration={durUV} setDuration={setDurUV} />
        </div>
      </div>
    </Modal>
  );
}

function ActorControl({ actorName, label, stateData, manualToggle, duration, setDuration }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-3">
      <h3 className="text-xs font-bold text-white uppercase text-center">{label}</h3>
      <div className="flex justify-center gap-1">
        <button 
          onClick={() => manualToggle(actorName, 1)}
          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${stateData.on && stateData.force === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
        >
          AN
        </button>
        <button 
          onClick={() => manualToggle(actorName, 0)}
          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${!stateData.on && stateData.force === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
        >
          AUS
        </button>
        <button 
          onClick={() => manualToggle(actorName, -1)}
          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${stateData.force === -1 ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
        >
          AUTO
        </button>
      </div>
      <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
        <label className="text-[10px] text-gray-400">Dauer (h)</label>
        <input 
          type="number" min="0" max="24"
          value={duration} onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-12 bg-black/40 border border-white/10 rounded px-1 py-1 text-center text-xs text-white outline-none focus:border-emerald-500/50"
        />
      </div>
    </div>
  );
}
