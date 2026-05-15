import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIoTSync } from '../context/IoTSyncContext';
import { useNavigate } from 'react-router-dom';
import { Plant } from '../types';
import { subscribeToPlants } from '../services/plantService';
import IoTDashboard from './IoT_Dashboard';
import IoTEnergy from './IoT_Energy';
import IoTLog from './IoT_Log';
import IoTSystem from './IoT_System';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Leaf, Activity, ScrollText, Settings, LogOut, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state, isConnected } = useIoTSync();
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'energie' | 'log' | 'system' | 'plants'>('home');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToPlants(user.uid, (data) => {
        setPlants(data);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard, desc: 'Real-time sensor data and live environment tracking.' },
    { id: 'plants', label: 'Plants', icon: Leaf, desc: 'Manage your garden, view plant health and moisture levels.' },
    { id: 'energie', label: 'Energy', icon: Activity, desc: 'Analyze power consumption and efficiency.' },
    { id: 'log', label: 'Logs', icon: ScrollText, desc: 'Detailed system logs and historical analytics.' },
    { id: 'system', label: 'System', icon: Settings, desc: 'Configure devices, MQTT broker, and system settings.' },
  ] as const;

  const renderHomeTab = () => {
    const { sensors, system, logs } = state;
    const temp = sensors?.temperature;
    const humidity = sensors?.humidity;
    const pwr = sensors?.pwr;

    const healthyCount = plants.filter(p => p.status === 'Stable').length;
    const errorsCount = logs?.filter((l: any) => l.lvl === 1).length || 0;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-12 z-10 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full"
      >
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Welcome, {user?.displayName || 'User'}</h1>
            <p className="text-muted-color text-sm mt-2">Here is a quick overview of your system.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between shadow-xl">
              <span className="text-[11px] text-muted-color font-bold uppercase tracking-widest flex items-center gap-2">
                {isConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />} 
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
          {/* Monitor Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.0 }}
            onClick={() => setActiveTab('dashboard')}
            className="bg-card-bg/50 backdrop-blur-3xl border border-white/10 hover:border-emerald-500/50 p-6 rounded-[32px] cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <LayoutDashboard className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors border border-white/5 group-hover:border-emerald-500/30 relative z-10">
              <LayoutDashboard className="w-6 h-6 text-white group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 relative z-10">Monitor</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-10 flex-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Temperature</p>
                <p className="text-2xl font-display font-bold text-white">{temp !== undefined ? Number(temp).toFixed(2).replace(/\.?0+$/, '') : '--'}<span className="text-sm text-muted-color ml-1">°C</span></p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Humidity</p>
                <p className="text-2xl font-display font-bold text-white">{humidity !== undefined ? Number(humidity).toFixed(2).replace(/\.?0+$/, '') : '--'}<span className="text-sm text-muted-color ml-1">%</span></p>
              </div>
            </div>
          </motion.div>

          {/* Plants Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setActiveTab('plants')}
            className="bg-card-bg/50 backdrop-blur-3xl border border-white/10 hover:border-emerald-500/50 p-6 rounded-[32px] cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
              <Leaf className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors border border-white/5 group-hover:border-emerald-500/30 relative z-10">
              <Leaf className="w-6 h-6 text-white group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 relative z-10">Plants</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-10 flex-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Total Plants</p>
                <p className="text-2xl font-display font-bold text-white">{plants.length}</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Healthy</p>
                <p className="text-2xl font-display font-bold text-emerald-400">{healthyCount}</p>
              </div>
            </div>
          </motion.div>

          {/* Energy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setActiveTab('energie')}
            className="bg-card-bg/50 backdrop-blur-3xl border border-white/10 hover:border-emerald-500/50 p-6 rounded-[32px] cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-amber-400">
              <Activity className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors border border-white/5 group-hover:border-emerald-500/30 relative z-10">
              <Activity className="w-6 h-6 text-white group-hover:text-amber-400 transition-colors" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 relative z-10">Energy</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-10 flex-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Current Usage</p>
                <p className="text-2xl font-display font-bold text-white">{pwr?.p !== undefined ? Number(pwr.p).toFixed(2).replace(/\.?0+$/, '') : '--'}<span className="text-sm text-muted-color ml-1">W</span></p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Today</p>
                <p className="text-2xl font-display font-bold text-amber-400">{pwr?.e !== undefined ? (pwr.e / 1000).toFixed(2).replace(/\.?0+$/, '') : '--'}<span className="text-sm text-amber-400/50 ml-1">kWh</span></p>
              </div>
            </div>
          </motion.div>

          {/* Logs & Analytics Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setActiveTab('log')}
            className="bg-card-bg/50 backdrop-blur-3xl border border-white/10 hover:border-emerald-500/50 p-6 rounded-[32px] cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <ScrollText className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors border border-white/5 group-hover:border-emerald-500/30 relative z-10">
              <ScrollText className="w-6 h-6 text-white group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 relative z-10">Insights</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-10 flex-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Total Logs</p>
                <p className="text-2xl font-display font-bold text-white">{logs?.length || 0}</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-red-500/70 uppercase tracking-widest mb-1 font-bold">Errors</p>
                <p className="text-2xl font-display font-bold text-red-400">{errorsCount}</p>
              </div>
            </div>
          </motion.div>

          {/* System Config Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => setActiveTab('system')}
            className="bg-card-bg/50 backdrop-blur-3xl border border-white/10 hover:border-emerald-500/50 p-6 rounded-[32px] cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
              <Settings className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors border border-white/5 group-hover:border-emerald-500/30 relative z-10">
              <Settings className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2 relative z-10">System</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-10 flex-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Connection</p>
                <div className="text-lg font-display font-bold text-white leading-tight mt-2 flex items-center gap-2">
                  {isConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                  {isConnected ? 'Active' : 'Offline'}
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-muted-color uppercase tracking-widest mb-1 font-bold">Cloud Sync</p>
                <div className="text-lg font-display font-bold text-emerald-400 leading-tight mt-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Synced
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    );
  };

  const renderPlantsTab = () => {
    const avgMoisture = plants.length > 0 
      ? Math.round(plants.reduce((acc, p) => acc + p.moisture, 0) / plants.length)
      : 0;

    const healthyCount = plants.filter(p => p.status === 'Stable').length;
    const healthScore = plants.length > 0 
      ? Math.round((healthyCount / plants.length) * 100)
      : 0;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-4 md:p-8 z-10 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-7xl mx-auto w-full"
      >
        <header className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Plant Inventory</h1>
          <p className="text-muted-color text-sm mt-1">
            {plants.length > 0 
              ? `You have ${plants.length} plants. ${healthyCount} are mostly healthy.`
              : 'Add your first plant!'}
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-card-bg/80 backdrop-blur-xl border border-white/5 p-5 md:p-6 rounded-[24px] flex flex-col justify-between shadow-2xl">
            <div className="flex justify-between items-start">
              <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </span>
              <span className="text-[10px] font-bold text-blue-400 tracking-wider">
                {avgMoisture >= 40 && avgMoisture <= 75 ? 'OPTIMAL' : 'ATTENTION'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl md:text-4xl font-display font-bold">{avgMoisture}<span className="text-xl md:text-2xl text-blue-400/50">%</span></p>
              <p className="text-[10px] md:text-xs text-muted-color uppercase tracking-widest mt-1">Avg Moisture</p>
            </div>
          </div>

          <div className="bg-card-bg/80 backdrop-blur-xl border border-white/5 p-5 md:p-6 rounded-[24px] flex flex-col justify-between shadow-2xl">
            <div className="flex justify-between items-start">
              <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
                {healthScore >= 80 ? 'HEALTHY' : 'NEEDS CARE'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl md:text-4xl font-display font-bold text-emerald-400">{healthScore}<span className="text-xl md:text-2xl text-emerald-400/50">%</span></p>
              <p className="text-[10px] md:text-xs text-muted-color uppercase tracking-widest mt-1">Health Score</p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card-bg/80 backdrop-blur-xl border border-white/5 rounded-[32px] p-4 md:p-8 shadow-2xl flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6 md:mb-8 flex-wrap gap-4">
            <h3 className="text-lg md:text-xl font-display font-semibold">Pots & Plants</h3>
            <button 
              onClick={() => navigate('/plants/new')}
              className="px-4 py-2 md:px-5 md:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs md:text-sm font-bold rounded-full transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              + NEW PLANT
            </button>
          </div>
          
          <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="hidden sm:grid grid-cols-4 px-4 text-[10px] uppercase tracking-widest text-muted-color font-bold mb-2">
              <span>Species</span>
              <span>Moisture</span>
              <span>Light</span>
              <span className="text-right">Status</span>
            </div>
            
            {loading ? (
              <div className="text-center py-10 text-muted-color">Loading Inventory...</div>
            ) : plants.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-color mb-4">No plants added yet.</p>
              </div>
            ) : (
              plants.map((plant, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={plant.id} 
                  onClick={() => navigate(`/plants/${plant.id}`)}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4 items-center px-4 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex flex-shrink-0 items-center justify-center text-sm font-bold text-emerald-300 group-hover:scale-110 transition-transform">
                      {plant.species.substring(0,2).toUpperCase()}
                    </div>
                    <span className="text-sm md:text-base font-medium">{plant.species}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${plant.moisture < 30 ? 'bg-amber-400' : plant.moisture > 80 ? 'bg-blue-400' : 'bg-emerald-400'}`} 
                        style={{ width: `${plant.moisture}%` }}
                      ></div>
                    </div>
                    <span className="text-xs md:text-sm font-mono text-muted-color">{plant.moisture}%</span>
                  </div>
                  <div className="text-xs md:text-sm text-muted-color hidden sm:block">{plant.sunlight}</div>
                  <div className="sm:text-right flex justify-between sm:block">
                    <span className="sm:hidden text-xs text-muted-color">Status</span>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      plant.status === 'Stable' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      plant.status === 'Thirsty' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {plant.status === 'Stable' ? 'STABLE' : plant.status === 'Thirsty' ? 'THIRSTY' : 'CRITICAL'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'home': return renderHomeTab();
      case 'dashboard': return <IoTDashboard />;
      case 'plants': return renderPlantsTab();
      case 'energie': return <IoTEnergy />;
      case 'log': return <IoTLog />;
      case 'system': return <IoTSystem />;
      default: return renderHomeTab();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full relative font-sans text-slate-100 overflow-hidden bg-page-bg">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-page-bg to-emerald-900/10 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-20 border-b border-white/5 bg-card-bg/50 backdrop-blur-3xl shrink-0 flex items-center justify-between px-6 md:px-12 z-40 relative">
        <div 
          className="flex items-center cursor-pointer group"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mr-4 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 text-black" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tight text-white">GrowSafe</span>
        </div>

        <div className="flex items-center gap-6">
          {activeTab !== 'home' && (
            <button 
              onClick={() => setActiveTab('home')}
              className="hidden md:flex items-center gap-2 text-sm font-bold text-muted-color hover:text-white uppercase tracking-widest transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
            >
              <LayoutDashboard className="w-4 h-4" /> Back to menu
            </button>
          )}

          <div className="flex items-center gap-3 border-l border-white/10 pl-6 hidden md:flex">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User avatar" className="w-10 h-10 rounded-full border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 border border-white/10 shadow-inner flex shrink-0" />
            )}
            <button 
              onClick={handleLogout} 
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-muted-color hover:text-red-400 flex items-center justify-center transition-colors shadow-sm border border-white/10"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Mobile secondary header if not on home tab */}
        {activeTab !== 'home' && (
          <header className="md:hidden h-[60px] flex items-center justify-between px-6 bg-card-bg/30 backdrop-blur-xl border-b border-white/5 shrink-0 relative z-40">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 text-xs font-bold text-muted-color hover:text-white uppercase tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Menu
            </button>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </header>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

