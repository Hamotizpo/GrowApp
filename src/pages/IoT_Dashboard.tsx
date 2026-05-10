import React, { useState } from 'react';
import { useIoTSync } from '../context/IoTSyncContext';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Sun, Wind, Power, Droplet, Flame, Target, Settings, Leaf } from 'lucide-react';
import TempModal from '../components/modals/TempModal';
import HumidityModal from '../components/modals/HumidityModal';
import PotModal from '../components/modals/PotModal';
import AirActorsModal from '../components/modals/AirActorsModal';
import LightModal from '../components/modals/LightModal';
import ActorModal from '../components/modals/ActorModal';
import { cn } from '../lib/utils';

const renderBadge = (on: boolean, textOn: string = 'ON', textOff: string = 'OFF') => (
  <span className={cn(
    "px-2.5 py-[2px] text-[10px] font-bold rounded-full border transition-colors",
    on ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-color border-white/10"
  )}>
    {on ? textOn : textOff}
  </span>
);

const ActorBadge = ({ label, icon: Icon, act, onClick }: any) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 md:hover:scale-105 active:scale-95 group",
        act?.on ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.1)] text-emerald-300" : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
      )}
    >
      {Icon && <Icon className={cn("w-3.5 h-3.5", act?.on ? "text-emerald-400" : "text-slate-400")} />}
      <span className="text-[11px] font-medium">{label}</span>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full ml-1",
        act?.on ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "bg-slate-600"
      )} />
    </button>
  );
};

const Card = ({ children, onClick, className }: any) => (
  <motion.div 
    whileHover={onClick ? { y: -2 } : {}}
    onClick={onClick}
    className={cn(
      "bg-card-bg/60 backdrop-blur-xl border border-white/5 rounded-[24px] p-5 shadow-2xl flex flex-col",
      onClick && "cursor-pointer md:hover:border-white/20 transition-colors",
      className
    )}
  >
    {children}
  </motion.div>
);

export default function IoTDashboard() {
  const { state, sendCloudCommand } = useIoTSync();
  const { sensors, actors, system } = state;

  const env = system?.envConfig || {};
  const lightWhite = actors?.light_white?.settings || actors?.light_white || {};
  const temp = sensors?.temperature;
  const humidity = sensors?.humidity;
  const soil = sensors?.soil || {};

  // Modals state
  const [tempModalOpen, setTempModalOpen] = useState(false);
  const [humidityModalOpen, setHumidityModalOpen] = useState(false);
  const [airActorsModalOpen, setAirActorsModalOpen] = useState(false);
  const [lightModalOpen, setLightModalOpen] = useState(false);
  const [potModalOpen, setPotModalOpen] = useState(false);
  const [activePot, setActivePot] = useState<1 | 2>(1);

  const [actorModalOpen, setActorModalOpen] = useState(false);
  const [targetActor, setTargetActor] = useState<string | null>(null);

  const [envPoints, setEnvPoints] = useState(100);

  const getActorState = (name: string) => actors[name] || {};

  const levelTxt = ["ERR", "Wet", "Moist", "Dry?", "Dry"];
  
  const toScale15 = (adc: number | undefined) => {
    if (adc === undefined) return '-';
    const v = Math.floor(Math.max(0, Math.min(4095, Number(adc) || 0)) * 14 / 4095) + 1;
    return Math.max(1, Math.min(15, v));
  };

  const envData = envPoints === -1 ? (state.env || []) : (state.env || []).slice(-envPoints);

  return (
    <div className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full overflow-y-scroll overflow-x-hidden w-full max-w-7xl mx-auto custom-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">

        {/* Lichter */}
        <Card onClick={() => setLightModalOpen(true)} className="group">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-white font-display font-bold text-lg">Lighting</h3>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-color group-hover:bg-white/10 transition-colors pointer-events-none">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <span className="text-[10px] text-muted-color font-bold uppercase mb-1 block">Mode</span>
              <span className="text-white font-semibold text-sm">{env.stage || 'Auto'}</span>
            </div>
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <span className="text-[10px] text-muted-color font-bold uppercase mb-1 block">Schedule</span>
              <span className="text-white font-semibold text-sm truncate block">
                {(env.dayStartTime ?? env.dStart) ? `${(env.dayStartTime ?? env.dStart).toString().slice(0,2)}:${(env.dayStartTime ?? env.dStart).toString().slice(2)}` : '--:--'} - {(env.nightStartTime ?? env.nStart) ? `${(env.nightStartTime ?? env.nStart).toString().slice(0,2)}:${(env.nightStartTime ?? env.nStart).toString().slice(2)}` : '--:--'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-2"><Power className="w-3.5 h-3.5 text-muted-color" /> Softstart</span>
              {renderBadge(getActorState('light_white').ss, 'ACTIVE', 'INACTIVE')}
            </div>
            <div className="flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-2"><Sun className="w-3.5 h-3.5 text-amber-200" /> White</span>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-mono text-muted-color">{getActorState('light_white').pwm !== undefined ? `(${getActorState('light_white').pwm})` : ''}</span>
                {renderBadge(getActorState('light_white').on)}
              </div>
            </div>
            <div className="flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-red-400" /> IR</span>
              {renderBadge(getActorState('light_ir').on)}
            </div>
            <div className="flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-2"><Target className="w-3.5 h-3.5 text-purple-400" /> UV</span>
              {renderBadge(getActorState('light_uv').on)}
            </div>
          </div>

          <div className="mt-6 flex-1 min-h-[120px] w-full bg-black/20 rounded-xl p-3 border border-white/5 overflow-hidden relative">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const lightWhiteCfg = actors?.light_white?.settings || actors?.light_white || {};
                const lightUV = actors?.light_uv?.settings || actors?.light_uv || {};
                const lightIR = actors?.light_ir?.settings || actors?.light_ir || {};
                const dStart = env.dayStartTime ?? env.dStart;
                const startH = parseInt(dStart?.toString().slice(0, 2) || '6', 10);
                const wDur = lightWhiteCfg?.duration ? Math.round(lightWhiteCfg.duration / 60) : 18;
                const uvDur = lightUV?.duration ? Math.round(lightUV.duration / 60) : 4;
                const irDur = lightIR?.duration ? Math.round(lightIR.duration / 60) : 18;

                const endWhite = (startH + wDur) % 24;
                const uvStart = (startH + Math.floor(wDur / 2) - Math.floor(uvDur / 2)) % 24;
                const uvEnd = (uvStart + uvDur) % 24;

                const inRange = (h: number, s: number, e: number) => {
                  if (s < e) return h >= s && h <= e;
                  return h >= s || h <= e;
                };

                const chartData = Array.from({ length: 25 }).map((_, i) => {
                  const hour = i;
                  let whiteVal = 0;
                  if (inRange(hour, startH, endWhite)) {
                    if (hour === startH) whiteVal = 0.5;
                    else if (hour === endWhite) whiteVal = 0.5;
                    else whiteVal = 1;
                  }
                  
                  const uvVal = inRange(hour, uvStart, uvEnd) && uvDur > 0 ? 0.3 : 0;
                  
                  let irVal = 0;
                  if (inRange(hour, startH, (startH + irDur) % 24) && irDur > 0) {
                      irVal = 0.4;
                  }

                  return { hour, white: whiteVal, uv: uvVal, ir: irVal };
                });

                return (
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <defs>
                      <linearGradient id="colorWhiteDb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUVDb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIRDb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(tick) => `${tick}h`} 
                      stroke="rgba(255,255,255,0.2)"
                      fontSize={9}
                      tickMargin={8}
                      interval="preserveStartEnd"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, 1.2]} />
                    <Tooltip 
                      labelFormatter={(label) => `${label}:00`}
                      contentStyle={{ backgroundColor: 'rgba(13,45,58,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area type="monotone" name="White" dataKey="white" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorWhiteDb)" isAnimationActive={false} />
                    <Area type="stepAfter" name="UV" dataKey="uv" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorUVDb)" isAnimationActive={false} />
                    <Area type="stepAfter" name="IR" dataKey="ir" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorIRDb)" isAnimationActive={false} />
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Luft */}
        <Card className="xl:col-span-2 relative z-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Wind className="w-5 h-5" />
              </div>
              <h3 className="text-white font-display font-bold text-lg">Climate</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={envPoints}
                onChange={(e) => setEnvPoints(Number(e.target.value))}
                className="bg-black/30 text-white outline-none text-xs rounded-lg px-2 py-1.5 border border-white/5 font-medium cursor-pointer"
              >
                <option value="60">Last 60 pts</option>
                <option value="150">Last 150 pts</option>
                <option value="500">Last 500 pts</option>
                <option value="-1">All Time</option>
              </select>
              <button 
                onClick={(e) => { e.stopPropagation(); setAirActorsModalOpen(true); }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" /> Actors
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => setTempModalOpen(true)}
              className="bg-black/20 p-5 rounded-[20px] border border-white/5 cursor-pointer hover:bg-black/30 transition-colors group relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-500/20 rounded-lg"><Thermometer className="w-4 h-4 text-red-400" /></div>
                <div className="text-sm font-semibold text-white">Temperature</div>
              </div>
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <div className="text-[10px] text-muted-color font-bold uppercase mb-1 tracking-widest">Current</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tighter">
                    {temp !== undefined ? temp.toFixed(1) : '-'} <span className="text-xl text-white/50 font-sans tracking-normal">°C</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-white/40 bg-white/5 rounded-lg p-2.5">
                  <div className="flex justify-between gap-3"><span>Target:</span> <span className="text-white/80 font-mono">{env.minTemperature ?? env.tMin ?? '-'} - {env.maxTemperature ?? env.tMax ?? '-'} °C</span></div>
                  <div className="flex justify-between gap-3"><span>Δ Night:</span> <span className="text-blue-300 font-mono">{env.tempNightDiff ?? env.tNd ?? env.tempNd ?? env.tempND ?? '-'} °C</span></div>
                  <div className="flex justify-between gap-3"><span>Critical:</span> <span className="text-red-400 font-mono">{env.criticalTemperature ?? env.tCri ?? env.tCritic ?? '-'} °C</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => setHumidityModalOpen(true)}
              className="bg-black/20 p-5 rounded-[20px] border border-white/5 cursor-pointer hover:bg-black/30 transition-colors group relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg"><Droplets className="w-4 h-4 text-blue-400" /></div>
                <div className="text-sm font-semibold text-white">Humidity</div>
              </div>
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <div className="text-[10px] text-muted-color font-bold uppercase mb-1 tracking-widest">Current</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tighter">
                    {humidity !== undefined ? humidity.toFixed(1) : '-'} <span className="text-xl text-white/50 font-sans tracking-normal">%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-white/40 bg-white/5 rounded-lg p-2.5">
                  <div className="flex justify-between gap-3"><span>Target:</span> <span className="text-white/80 font-mono">{env.minHumidity ?? env.hMin ?? '-'} - {env.maxHumidity ?? env.hMax ?? '-'} %</span></div>
                  <div className="flex justify-between gap-3"><span>+ Night:</span> <span className="text-blue-300 font-mono">{env.humidityNightDiff ?? env.hNd ?? env.humidNd ?? env.humidND ?? '-'} %</span></div>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="bg-black/20 rounded-[20px] p-4 border border-white/5 mb-6">
            <div className="text-[10px] text-muted-color font-bold uppercase mb-3 tracking-widest px-1">Active Actors</div>
            <div className="flex flex-wrap gap-2">
              <ActorBadge 
                label="Fan" 
                icon={Wind} 
                act={getActorState("fan")} 
                onClick={() => { setTargetActor("fan"); setActorModalOpen(true); }} 
              />
              <ActorBadge 
                label="Circulate" 
                icon={Wind} 
                act={getActorState("circulating_fan")} 
                onClick={() => { setTargetActor("circulating_fan"); setActorModalOpen(true); }} 
              />
              <ActorBadge 
                label="Humidify" 
                icon={Droplets} 
                act={getActorState("humidifier")} 
                onClick={() => { setTargetActor("humidifier"); setActorModalOpen(true); }} 
              />
              <ActorBadge 
                label="Dehumidify" 
                icon={Wind} 
                act={getActorState("dehumidifire")} 
                onClick={() => { setTargetActor("dehumidifire"); setActorModalOpen(true); }} 
              />
              <ActorBadge 
                label="Heater" 
                icon={Flame} 
                act={getActorState("heater")} 
                onClick={() => { setTargetActor("heater"); setActorModalOpen(true); }} 
              />
            </div>
          </div>

          <div className="flex-1 min-h-[220px] w-full bg-black/20 rounded-[20px] p-4 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis 
                  dataKey="x" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={10}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis yAxisId="left" domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]} stroke="rgba(255,255,255,0.2)" fontSize={10} width={40} tickFormatter={(val) => Math.round(val).toString()} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]} stroke="rgba(255,255,255,0.2)" fontSize={10} width={40} tickFormatter={(val) => Math.round(val).toString()} axisLine={false} tickLine={false} />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: 'rgba(13,45,58,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="t" name="Temp °C" stroke="#f87171" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="h" name="Hum. %" stroke="#60a5fa" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Erde */}
        <Card className="xl:col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="text-white font-display font-bold text-lg">Soil & Water</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-4 mb-6">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => { setActivePot(1); setPotModalOpen(true); }}
              className="bg-black/20 p-5 rounded-[20px] border border-white/5 hover:bg-black/30 cursor-pointer transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
              <div className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Pot 1</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-muted-color font-bold uppercase mb-1 tracking-widest">Status</div>
                  <div className="text-2xl font-display font-bold text-white tracking-tighter">{soil.pot1 !== undefined ? levelTxt[soil.pot1] || '?' : '-'}</div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-white/40 font-mono text-right bg-white/5 rounded-lg px-2 py-1.5">
                  <div className="flex gap-2 justify-between"><span>ADC:</span> <span className="text-white/80">{soil.raw1 !== undefined ? soil.raw1 : '-'}</span></div>
                  <div className="flex gap-2 justify-between"><span>Scale:</span> <span className="text-white/80">{toScale15(soil.raw1)}/15</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => { setActivePot(2); setPotModalOpen(true); }}
              className="bg-black/20 p-5 rounded-[20px] border border-white/5 hover:bg-black/30 cursor-pointer transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
              <div className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Pot 2</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-muted-color font-bold uppercase mb-1 tracking-widest">Status</div>
                  <div className="text-2xl font-display font-bold text-white tracking-tighter">{soil.pot2 !== undefined ? levelTxt[soil.pot2] || '?' : '-'}</div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-white/40 font-mono text-right bg-white/5 rounded-lg px-2 py-1.5">
                  <div className="flex gap-2 justify-between"><span>ADC:</span> <span className="text-white/80">{soil.raw2 !== undefined ? soil.raw2 : '-'}</span></div>
                  <div className="flex gap-2 justify-between"><span>Scale:</span> <span className="text-white/80">{toScale15(soil.raw2)}/15</span></div>
                </div>
              </div>
            </motion.div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-900/10 p-5 rounded-[20px] border border-blue-500/20 relative overflow-hidden mt-2">
               <div className="absolute -top-2 -right-2 p-3 text-blue-500 opacity-20 transform rotate-12"><Droplet size={64} /></div>
              <div className="text-sm font-semibold text-blue-200 mb-4 flex items-center gap-2">Reservoir</div>
              <div className="flex justify-between items-center relative z-10">
                <div className="text-[10px] text-blue-300/60 font-bold uppercase mb-1 tracking-widest">Level Status</div>
                <div className={cn(
                  "text-lg font-display font-bold px-4 py-1.5 rounded-full",
                  sensors?.tankEmpty ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                )}>
                  {sensors?.tankEmpty === undefined ? '-' : (sensors.tankEmpty ? '🚨 EMPTY' : '✅ OPTIMAL')}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-[20px] p-4 border border-white/5 flex-1 flex flex-col justify-end">
            <div className="text-[10px] text-muted-color font-bold uppercase mb-3 tracking-widest px-1">Active Actors</div>
            <div className="flex flex-wrap gap-2">
              <ActorBadge 
                label="Water Pump" 
                icon={Droplet} 
                act={getActorState("pump")} 
                onClick={() => { setTargetActor("pump"); setActorModalOpen(true); }} 
              />
            </div>
          </div>
        </Card>

      </div>
      
      {/* Modals */}
      <TempModal isOpen={tempModalOpen} onClose={() => setTempModalOpen(false)} />
      <HumidityModal isOpen={humidityModalOpen} onClose={() => setHumidityModalOpen(false)} />
      <AirActorsModal isOpen={airActorsModalOpen} onClose={() => setAirActorsModalOpen(false)} />
      <LightModal isOpen={lightModalOpen} onClose={() => setLightModalOpen(false)} />
      <PotModal isOpen={potModalOpen} onClose={() => setPotModalOpen(false)} index={activePot} />
      <ActorModal isOpen={actorModalOpen} onClose={() => setActorModalOpen(false)} actorName={targetActor} />
    </div>
  );
}
