import React, { useState } from 'react';
import { useIoTSync } from '../context/IoTSyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Filter, AlertTriangle, Info, AlertCircle, Cpu, Download, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export default function IoTLog() {
  const { state } = useIoTSync();
  const { logs } = state;
  const [filterLevel, setFilterLevel] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedLogs, setPausedLogs] = useState<any[]>([]);
  const [clearTs, setClearTs] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const activeLogs = isPaused ? pausedLogs : logs.filter(log => {
      // Very basic approach: we only know strings for ts, so actually clearTs won't perfectly filter by Date unless we parse it.
      // Better to check if the log id or something was after we clicked clear.
      // But since id has Date.now() we can parse it from `log.id`.
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
    if (isPaused) {
        setPausedLogs([]);
    }
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
      case 0: return 'text-red-400 bg-red-400/10 border-red-400/20'; // ERROR
      case 1: return 'text-amber-400 bg-amber-400/10 border-amber-400/20'; // WARN
      case 2: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'; // INFO
      case 3: return 'text-slate-400 bg-white/5 border-white/10'; // DEBUG
      default: return 'text-slate-500 bg-white/5 border-white/5'; // RAW
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

  return (
    <div className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto custom-scrollbar">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                <Terminal className="w-6 h-6" />
              </div>
              System Logs
            </h1>
            {isPaused && (
              <span className="px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest rounded-lg animate-pulse">
                Paused
              </span>
            )}
          </div>
          <p className="text-muted-color text-sm mt-2">Real-time device and application telemetry logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card-bg/80 backdrop-blur-xl border border-white/5 rounded-2xl p-2 px-3 shadow-xl">
            <Search className="w-4 h-4 text-muted-color" />
            <input 
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-28 md:w-40 border-none"
            />
          </div>
          <button
            onClick={handleDownload}
            className="bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 p-2.5 rounded-2xl border border-white/5 transition-colors flex items-center justify-center"
            title="Download Logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 px-4 py-2.5 rounded-2xl border border-white/5 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handlePauseToggle}
            className={cn(
               "text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-2xl border transition-colors",
               isPaused ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5"
            )}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <div className="flex items-center gap-3 bg-card-bg/80 backdrop-blur-xl border border-white/5 rounded-2xl p-2 px-4 shadow-xl">
            <Filter className="w-4 h-4 text-muted-color" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-color">Level:</span>
            <select 
              value={filterLevel}
              onChange={e => setFilterLevel(parseInt(e.target.value))}
              className="bg-transparent text-white outline-none text-sm cursor-pointer border-none font-medium [&>option]:bg-card-bg"
            >
              <option value="-1">All Levels</option>
              <option value="0">ERROR</option>
              <option value="1">WARN</option>
              <option value="2">INFO</option>
              <option value="3">DEBUG</option>
            </select>
          </div>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 bg-card-bg/80 backdrop-blur-xl border border-white/5 rounded-[24px] flex flex-col shadow-2xl overflow-hidden text-sm"
      >
        <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-4 border-b border-white/5 bg-white/5 text-muted-color text-[10px] tracking-widest uppercase font-bold sticky top-0 z-10">
          <div className="col-span-3 md:col-span-2">Time</div>
          <div className="col-span-3 md:col-span-2">Level</div>
          <div className="col-span-6 md:col-span-2">Tag</div>
          <div className="col-span-12 md:col-span-6 hidden md:block">Message</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-color">
              <Terminal className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-sm">Waiting for logs...</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredLogs.map(log => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id} 
                  className="grid grid-cols-1 md:grid-cols-12 gap-y-2 md:gap-x-4 items-start px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
                >
                  <div className="col-span-1 md:col-span-2 font-mono text-xs text-slate-400 whitespace-nowrap self-center">
                    {log.ts}
                  </div>
                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border", getLevelColor(log.lvl))}>
                       {getLevelIcon(log.lvl)} {getLevelStr(log.lvl)}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-2 text-xs font-mono text-blue-300 self-center">
                    [{log.tag}]
                  </div>
                  <div className="col-span-1 md:col-span-6 font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {log.msg}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
