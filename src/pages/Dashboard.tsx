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
import { LayoutDashboard, Leaf, Activity, ScrollText, Settings, Menu, X, LogOut, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state, isConnected } = useIoTSync();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'energie' | 'log' | 'system' | 'plants'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'plants', label: 'Plants', icon: Leaf },
    { id: 'energie', label: 'Energy', icon: Activity },
    { id: 'log', label: 'Logs', icon: ScrollText },
    { id: 'system', label: 'System', icon: Settings },
  ] as const;

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
      case 'dashboard': return <IoTDashboard />;
      case 'plants': return renderPlantsTab();
      case 'energie': return <IoTEnergy />;
      case 'log': return <IoTLog />;
      case 'system': return <IoTSystem />;
      default: return <IoTDashboard />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full relative font-sans text-slate-100 overflow-hidden bg-page-bg">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-page-bg to-emerald-900/10 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-card-bg/50 backdrop-blur-3xl border-r border-white/5 z-40">
        <div className="flex items-center h-20 px-8 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mr-3 shadow-lg shadow-emerald-500/20">
            <Leaf className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-white">GrowSafe</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 relative group overflow-hidden",
                  isActive ? "text-white" : "text-muted-color hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabBg" 
                    className="absolute inset-0 bg-white/10" 
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-emerald-400" : "text-muted-color group-hover:text-emerald-400")} />
                <span className="relative z-10">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-6 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User avatar" className="w-10 h-10 rounded-full border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 border border-white/10 shadow-inner flex shrink-0" />
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user?.displayName || 'User'}</p>
              <button 
                onClick={handleLogout} 
                className="text-[10px] text-muted-color hover:text-red-400 transition-colors uppercase tracking-widest font-bold mt-1 flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-muted-color font-bold uppercase tracking-widest flex items-center gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} Status
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-md", 
              isConnected ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-red-400/10 text-red-400 border border-red-400/20"
            )}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <React.Fragment key="mobile-sidebar">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-64 bg-page-bg/90 backdrop-blur-3xl border-r border-white/5 z-[110] flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between h-20 px-6 border-b border-white/5 shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mr-3 shadow-lg shadow-emerald-500/20">
                    <Leaf className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-xl font-display font-bold tracking-tight text-white">GrowSafe</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-muted-color hover:text-white p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 relative group overflow-hidden",
                        isActive ? "text-white" : "text-muted-color hover:text-white"
                      )}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="mobileActiveTabBg" 
                          className="absolute inset-0 bg-white/10" 
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-emerald-400" : "text-muted-color group-hover:text-emerald-400")} />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  )
                })}
              </nav>
              <div className="p-6 border-t border-white/5 shrink-0">
                <div className="flex items-center gap-3 mb-6">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User avatar" className="w-10 h-10 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 border border-white/10 shadow-inner flex shrink-0" />
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate text-white">{user?.displayName || 'User'}</p>
                    <button 
                      onClick={handleLogout} 
                      className="text-[10px] text-muted-color hover:text-red-400 transition-colors uppercase tracking-widest font-bold mt-1 flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Mobile Header */}
        <header className="md:hidden h-[72px] flex items-center justify-between px-6 bg-card-bg/50 backdrop-blur-3xl border-b border-white/5 shrink-0 relative z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-color hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="w-4 h-4 text-black" />
              </div>
              <span className="font-display font-bold text-lg">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
            )} />
          </div>
        </header>

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

