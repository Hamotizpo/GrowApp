import React, { useState } from 'react';
import { useIoTSync } from '../context/IoTSyncContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Fan, Calculator, Zap, Battery, Euro } from 'lucide-react';
import { cn } from '../lib/utils';

const Card = ({ children, className }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-card-bg/80 backdrop-blur-xl border border-white/5 rounded-[24px] p-5 md:p-6 shadow-2xl flex flex-col relative overflow-hidden",
      className
    )}
  >
    {children}
  </motion.div>
);

export default function IoTEnergy() {
  const { state } = useIoTSync();
  const { sensors, energy } = state;

  const cabTemp = sensors?.cabinetTemp;
  const pwr = sensors?.pwr;
  const ina = sensors?.ina;
  
  const [pricePerKwh, setPricePerKwh] = useState(0.35);
  const [acPoints, setAcPoints] = useState(100);
  const [dcPoints, setDcPoints] = useState(100);

  const calculateCost = (wh: number) => {
    return ((wh / 1000) * pricePerKwh).toFixed(2);
  };

  const calculateMonthlyCost = (currentWatt: number) => {
    return (((currentWatt * 24 * 30) / 1000) * pricePerKwh).toFixed(2);
  };

  const pzemData = acPoints === -1 ? energy.pzem : energy.pzem.slice(-acPoints);
  const inaData = dcPoints === -1 ? energy.ina : energy.ina.slice(-dcPoints);

  return (
    <div className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full w-full max-w-7xl mx-auto overflow-y-scroll overflow-x-hidden custom-scrollbar">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Energy & System</h1>
        <p className="text-muted-color text-sm mt-1">Real-time power consumption and electronics monitoring.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* Cabinet Info */}
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-white font-display font-bold text-lg">Control Cabinet</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-4 rounded-[20px] border border-white/5 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Thermometer size={48} /></div>
              <div className="text-[10px] uppercase text-muted-color font-bold tracking-widest relative z-10">Temperature</div>
              <div className="text-3xl font-display font-bold text-white relative z-10">
                {cabTemp?.toFixed(1) || '--.-'} <span className="text-lg text-white/50 font-sans font-normal tracking-normal">°C</span>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-[20px] border border-white/5 flex flex-col gap-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-10"><Fan size={48} /></div>
              <div className="text-[10px] uppercase text-muted-color font-bold tracking-widest relative z-10">Fan Status</div>
              <div className="mt-1 relative z-10">
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                  state.actors?.internal_cooling?.on ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-muted-color border border-white/10"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", state.actors?.internal_cooling?.on ? "bg-emerald-400 animate-pulse" : "bg-slate-600")} />
                  {state.actors?.internal_cooling?.on ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Kosten Rechner */}
        <Card className="border-emerald-500/20 bg-gradient-to-br from-card-bg to-emerald-900/5">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 text-emerald-500 transform rotate-12"><Euro size={120} /></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Calculator className="w-5 h-5" />
              </div>
              <h2 className="text-white font-display font-bold text-lg">Cost Calculator</h2>
            </div>
             <div className="flex items-center gap-2 bg-black/40 rounded-xl border border-white/5 p-1 pl-3">
              <span className="text-[10px] text-muted-color font-bold uppercase tracking-widest">Rate</span>
              <input 
                type="number" 
                value={pricePerKwh} 
                onChange={e => setPricePerKwh(parseFloat(e.target.value) || 0)}
                step="0.01" 
                className="bg-white/5 border border-white/10 text-emerald-300 font-mono text-sm rounded-lg px-2 py-1 w-16 outline-none focus:border-emerald-500/50 transition-colors"
              />
              <span className="text-[10px] text-muted-color font-bold pr-2">€/kWh</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-black/20 p-4 rounded-[20px] border border-white/5">
              <div className="text-[10px] uppercase text-muted-color font-bold mb-2 tracking-widest">Total Cost</div>
              <div className="text-3xl font-display font-bold text-white tracking-tighter">
                {pwr?.e ? calculateCost(pwr.e) : '0.00'} <span className="text-lg text-white/50 font-sans tracking-normal">€</span>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-[20px] border border-white/5">
              <div className="text-[10px] uppercase text-emerald-400/70 font-bold mb-2 tracking-widest">Est. Monthly</div>
              <div className="text-3xl font-display font-bold text-emerald-400 tracking-tighter">
                {pwr?.p ? calculateMonthlyCost(pwr.p) : '0.00'} <span className="text-lg text-emerald-400/50 font-sans tracking-normal">€</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-6">
        
        {/* AC Energy */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-white font-display font-bold text-lg">AC Power <span className="text-muted-color text-sm font-normal ml-2">(PZEM)</span></h2>
            </div>
            <select
              value={acPoints}
              onChange={(e) => setAcPoints(Number(e.target.value))}
              className="bg-black/30 text-white outline-none text-xs rounded-lg px-2 py-1 border border-white/5 font-medium cursor-pointer"
            >
              <option value="60">Last 60 pts</option>
              <option value="150">Last 150 pts</option>
              <option value="500">Last 500 pts</option>
              <option value="-1">All Time</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/20 p-4 rounded-[20px] border border-white/5 mb-6">
            <div>
              <div className="text-[10px] uppercase text-muted-color font-bold mb-1 tracking-widest">Voltage</div>
              <div className="text-base font-mono text-white">{pwr?.u?.toFixed(1) || '--.-'} <span className="text-xs text-white/50">V</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-color font-bold mb-1 tracking-widest">Current</div>
              <div className="text-base font-mono text-white">{pwr?.i?.toFixed(3) || '-.---'} <span className="text-xs text-white/50">A</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-amber-400/70 font-bold mb-1 tracking-widest">Power</div>
              <div className="text-base font-mono font-bold text-amber-400">{pwr?.p?.toFixed(1) || '--.-'} <span className="text-xs text-amber-400/50">W</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-color font-bold mb-1 tracking-widest">Energy</div>
              <div className="text-base font-mono text-white">{pwr?.e?.toFixed(1) || '---.-'} <span className="text-xs text-white/50">Wh</span></div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] w-full bg-black/20 rounded-[20px] p-4 border border-white/5 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pzemData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                <YAxis domain={[(dMin: number) => Math.floor(Math.max(0, dMin - 5)), (dMax: number) => Math.ceil(dMax + 5)]} stroke="rgba(255,255,255,0.2)" fontSize={10} width={40} axisLine={false} tickLine={false} />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: 'rgba(13,45,58,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(8px)' }}
                />
                <Area type="monotone" dataKey="y" name="AC Watt" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorAC)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DC Energy */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Battery className="w-5 h-5" />
              </div>
              <h2 className="text-white font-display font-bold text-lg">DC Power <span className="text-muted-color text-sm font-normal ml-2">(INA)</span></h2>
            </div>
            <select
              value={dcPoints}
              onChange={(e) => setDcPoints(Number(e.target.value))}
              className="bg-black/30 text-white outline-none text-xs rounded-lg px-2 py-1 border border-white/5 font-medium cursor-pointer"
            >
              <option value="60">Last 60 pts</option>
              <option value="150">Last 150 pts</option>
              <option value="500">Last 500 pts</option>
              <option value="-1">All Time</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-black/20 p-4 rounded-[20px] border border-white/5 mb-6">
            <div>
              <div className="text-[10px] uppercase text-muted-color font-bold mb-1 tracking-widest">Bus Voltage</div>
              <div className="text-base font-mono text-white">{ina?.u?.toFixed(2) || '--.--'} <span className="text-xs text-white/50">V</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-color font-bold mb-1 tracking-widest">Current</div>
              <div className="text-base font-mono text-white">{ina?.i?.toFixed(3) || '-.---'} <span className="text-xs text-white/50">A</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-emerald-400/70 font-bold mb-1 tracking-widest">Power</div>
              <div className="text-base font-mono font-bold text-emerald-400">{ina?.p?.toFixed(2) || '--.-'} <span className="text-xs text-emerald-400/50">W</span></div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] w-full bg-black/20 rounded-[20px] p-4 border border-white/5 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inaData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                <YAxis domain={[(dMin: number) => Math.floor(Math.max(0, dMin - 5)), (dMax: number) => Math.ceil(dMax + 5)]} stroke="rgba(255,255,255,0.2)" fontSize={10} width={40} axisLine={false} tickLine={false} />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                  contentStyle={{ backgroundColor: 'rgba(13,45,58,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(8px)' }}
                />
                <Area type="monotone" dataKey="y" name="DC Watt" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorDC)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  );
}
