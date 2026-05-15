import React, { useState, useMemo } from 'react';
import { useIoTSync } from '../context/IoTSyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Filter, AlertTriangle, Info, AlertCircle, 
  Cpu, Download, Search, LineChart as ChartIcon, 
  Zap, Thermometer, Droplets, Clock, Trash2, Pause, Play,
  Settings2, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, AreaChart, Area 
} from 'recharts';
import { cn } from '../lib/utils';

// Helper component for Cloud Connection Status
const CloudConnectionBadge = ({ isConnected }: { isConnected: boolean }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm backdrop-blur-md">
    <div className="relative flex h-2 w-2">
      {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-emerald-500" : "bg-red-500")}></span>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
      {isConnected ? 'Cloud Storage Active' : 'Cloud Disconnected'}
    </span>
  </div>
);

const LogRow = ({ log, getLevelColor, getLevelIcon, getLevelStr }: any) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => setExpanded(!expanded)}
      className="grid grid-cols-1 md:grid-cols-12 gap-y-2 md:gap-x-4 items-start px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-colors border border-white/5 cursor-pointer group"
    >
      <div className="col-span-1 md:col-span-2 text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors self-center">
        {log.ts}
      </div>
      <div className="col-span-1 md:col-span-2 flex items-center self-center">
        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 border", getLevelColor(log.lvl))}>
            {getLevelIcon(log.lvl)} {getLevelStr(log.lvl)}
        </span>
      </div>
      <div className="col-span-1 md:col-span-8 text-[11px] text-emerald-400/70 group-hover:text-emerald-400 self-center break-all flex items-center gap-2">
        <span className="opacity-70">[{log.tag}]</span>
        {log.topic && <span className="text-emerald-300 font-semibold">{log.topic}</span>}
      </div>
      {expanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="col-span-1 md:col-span-12 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed group-hover:text-white transition-colors mt-2 p-3 bg-black/20 rounded-lg border border-white/5"
        >
          {log.msg}
        </motion.div>
      )}
    </motion.div>
  );
};

export default function IoTLog() {
  const { state, loadHistory, isConnected } = useIoTSync();
  const { logs, telemetryHistory } = state;
  const [activeTab, setActiveTab] = useState<'logs' | 'insights'>('logs');
  const [filterLevel, setFilterLevel] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedLogs, setPausedLogs] = useState<any[]>([]);
  const [clearTs, setClearTs] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeSpan, setTimeSpan] = useState<number>(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleTimeSpanChange = async (hours: number) => {
    setTimeSpan(hours);
    setIsLoadingHistory(true);
    await loadHistory(hours);
    setIsLoadingHistory(false);
  };

  // --------------------------------------------------------------------------
  // Log Logic
  // --------------------------------------------------------------------------
  const activeLogs = isPaused ? pausedLogs : logs.filter(log => {
    const ts = parseInt(log.id.split('_')[1] || "0", 10);
    return ts >= clearTs;
  });

  const handlePauseToggle = () => {
    if (!isPaused) {
      setPausedLogs([...activeLogs]);
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  };

  const handleClear = () => {
    setClearTs(Date.now());
    if (isPaused) setPausedLogs([]);
  };

  const handleDownload = () => {
    const raw = filteredLogs.map(l => `[${l.ts}] ${getLevelStr(l.lvl)} [${l.tag}] ${l.msg}`).join('\n');
    const blob = new Blob([raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GrowSafe_Logs_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelStr = (lvl: number) => {
    switch(lvl) {
      case 0: return 'ERROR';
      case 1: return 'WARN';
      case 2: return 'INFO';
      case 3: return 'DEBUG';
      default: return 'RAW';
    }
  };

  const getLevelColor = (lvl: number) => {
    switch(lvl) {
      case 0: return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 1: return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 2: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 3: return 'text-slate-400 bg-white/5 border-white/10';
      default: return 'text-slate-500 bg-white/5 border-white/5';
    }
  }

  const getLevelIcon = (lvl: number) => {
    switch(lvl) {
      case 0: return <AlertCircle className="w-3.5 h-3.5" />;
      case 1: return <AlertTriangle className="w-3.5 h-3.5" />;
      case 2: return <Info className="w-3.5 h-3.5" />;
      case 3: return <Cpu className="w-3.5 h-3.5" />;
      default: return <Terminal className="w-3.5 h-3.5" />;
    }
  };

  const filteredLogs = activeLogs.filter(log => {
    const matchLevel = filterLevel === -1 || log.lvl === filterLevel;
    const matchSearch = searchTerm === '' || log.tag.toLowerCase().includes(searchTerm.toLowerCase()) || log.msg.toLowerCase().includes(searchTerm.toLowerCase());
    return matchLevel && matchSearch;
  });

  // --------------------------------------------------------------------------
  // Insights Logic
  // --------------------------------------------------------------------------
  const chartData = useMemo(() => {
    return telemetryHistory.map(h => ({
      ...h,
      time: new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));
  }, [telemetryHistory]);

  const latestMetrics = useMemo(() => {
    if (telemetryHistory.length === 0) return null;
    return telemetryHistory[telemetryHistory.length - 1];
  }, [telemetryHistory]);

  const MetricCard = ({ title, value, unit, icon: Icon, color }: any) => (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-color">{title}</span>
        <div className={cn("p-1.5 rounded-lg", color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-display font-bold text-white">{value ?? 'N/A'}</span>
        <span className="text-xs text-muted-color">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Activity className="w-6 h-6" />
              </div>
              System & Insights
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <p className="text-muted-color text-sm pt-[2px] w-[300px] border-0 rounded-none bg-black">Professional real-time monitoring and historical telemetry analytics.</p>
              <div className="hidden md:block w-px h-4 bg-white/10"></div>
              <CloudConnectionBadge isConnected={isConnected} />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5 px-3 shadow-xl w-[150px]">
              <Clock className="w-4 h-4 text-muted-color" />
              <select 
                value={timeSpan}
                onChange={e => handleTimeSpanChange(parseInt(e.target.value))}
                disabled={isLoadingHistory}
                className="bg-transparent text-white outline-none text-xs cursor-pointer border-none font-bold uppercase tracking-widest [&>option]:bg-slate-900"
              >
                <option value="1">Last 1 Hour</option>
                <option value="6">Last 6 Hours</option>
                <option value="12">Last 12 Hours</option>
                <option value="24">Last 24 Hours</option>
                <option value="168">Last 7 Days</option>
                <option value="336">Last 14 Days</option>
                <option value="720">Last 30 Days</option>
                <option value="-1">All Time</option>
              </select>
              {isLoadingHistory && <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
            </div>

            <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
              <button 
                onClick={() => setActiveTab('logs')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'logs' ? "bg-white/10 text-white shadow-lg" : "text-muted-color hover:text-white"
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                Logs
              </button>
              <button 
                onClick={() => setActiveTab('insights')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'insights' ? "bg-white/10 text-white shadow-lg" : "text-muted-color hover:text-white"
                )}
              >
                <ChartIcon className="w-3.5 h-3.5" />
                Insights
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'logs' ? (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-3 shadow-xl">
                    <Search className="w-4 h-4 text-muted-color" />
                    <input 
                      type="text"
                      placeholder="Filter tags or messages..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-40 md:w-64 border-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 px-4 shadow-xl">
                    <Filter className="w-4 h-4 text-muted-color" />
                    <select 
                      value={filterLevel}
                      onChange={e => setFilterLevel(parseInt(e.target.value))}
                      className="bg-transparent text-white outline-none text-xs cursor-pointer border-none font-bold uppercase tracking-widest [&>option]:bg-slate-900"
                    >
                      <option value="-1">All Levels</option>
                      <option value="0">ERROR</option>
                      <option value="1">WARN</option>
                      <option value="2">INFO</option>
                      <option value="3">DEBUG</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button
                    onClick={handleDownload}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/5 transition-colors"
                    title="Export as Text"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                  <button
                    onClick={handlePauseToggle}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all",
                      isPaused 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5"
                    )}
                  >
                    {isPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-[24px] flex flex-col shadow-2xl overflow-hidden text-sm">
                <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-4 border-b border-white/5 bg-white/5 text-muted-color text-[10px] tracking-widest uppercase font-bold sticky top-0 z-10">
                  <div className="col-span-3 md:col-span-2">Time</div>
                  <div className="col-span-3 md:col-span-2">Level</div>
                  <div className="col-span-6 md:col-span-8">Tag / Topic</div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-2 font-mono">
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-color opacity-30 py-20">
                      <Terminal className="w-16 h-16 mb-4" />
                      <p className="text-sm uppercase tracking-[0.2em] font-bold">Waiting for telemetry stream...</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {filteredLogs.map(log => (
                        <LogRow 
                          key={log.id} 
                          log={log} 
                          getLevelColor={getLevelColor} 
                          getLevelIcon={getLevelIcon} 
                          getLevelStr={getLevelStr} 
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar"
            >
              {/* Metric Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Temperature" 
                  value={latestMetrics?.t} 
                  unit="°C" 
                  icon={Thermometer} 
                  color="bg-orange-500/10 text-orange-400" 
                />
                <MetricCard 
                  title="Humidity" 
                  value={latestMetrics?.h} 
                  unit="%" 
                  icon={Droplets} 
                  color="bg-blue-500/10 text-blue-400" 
                />
                <MetricCard 
                  title="Power (PZEM)" 
                  value={latestMetrics?.p_pzem} 
                  unit="W" 
                  icon={Zap} 
                  color="bg-emerald-500/10 text-emerald-400" 
                />
                <MetricCard 
                  title="Current (INA)" 
                  value={latestMetrics?.a} 
                  unit="A" 
                  icon={Activity} 
                  color="bg-purple-500/10 text-purple-400" 
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-xl h-[400px]">
                  <header className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        Environmental Metrics
                      </h3>
                      <p className="text-[10px] text-muted-color uppercase tracking-widest mt-1">Real-time Temp & Humidity History</p>
                    </div>
                  </header>
                  <div className="flex-1 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorH" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                        <Area type="monotone" name="Temperature (°C)" dataKey="t" stroke="#f97316" fillOpacity={1} fill="url(#colorT)" />
                        <Area type="monotone" name="Humidity (%)" dataKey="h" stroke="#3b82f6" fillOpacity={1} fill="url(#colorH)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-xl h-[400px]">
                  <header className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Power Analysis
                      </h3>
                      <p className="text-[10px] text-muted-color uppercase tracking-widest mt-1">Energy consumption & load profile</p>
                    </div>
                  </header>
                  <div className="flex-1 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                        <Line type="step" name="Main Power (W)" dataKey="p_pzem" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="step" name="Logic Power (W)" dataKey="p_ina" stroke="#a855f7" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-slate-900/40 border border-emerald-500/10 rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_0_40px_-15px_rgba(16,185,129,0.1)]">
                {/* Background decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50 pointer-events-none"></div>

                <div className="flex items-center gap-6 z-10">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-lg">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                       Secure Cloud Storage
                       {isConnected && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/30">Syncing</span>}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-md leading-relaxed">
                      All metrics are safely pushed to your Firestore database. Displaying <strong className="text-emerald-400">{telemetryHistory.length}</strong> aggregated data points for the selected time range. 
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto z-10">
                   <button 
                    onClick={() => {
                        const csvRows = [
                          ["Timestamp", "LocalTime", "Temp", "Humidity", "P_PZEM", "P_INA", "V", "A"],
                          ...telemetryHistory.map(h => [h.ts, new Date(h.ts).toISOString(), h.t, h.h, h.p_pzem, h.p_ina, h.v, h.a])
                        ];
                        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                        const link = document.createElement("a");
                        link.setAttribute("href", encodeURI(csvContent));
                        link.setAttribute("download", `growsafe_export_${Date.now()}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 group bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl border border-white/10 transition-all text-xs font-bold uppercase tracking-widest shadow-xl"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
