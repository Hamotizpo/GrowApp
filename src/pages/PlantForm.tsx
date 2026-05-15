import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { addPlant, updatePlant, deletePlant } from '../services/plantService';
import { subscribeToGrowthLogs, addGrowthLog, updateGrowthLog, deleteGrowthLog } from '../services/growthLogService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plant, GrowthLog } from '../types';
import { Calendar, Plus, Trash2, Edit2, Check, X, History } from 'lucide-react';

export default function PlantForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  
  const [formData, setFormData] = useState<Partial<Plant>>({
    species: '',
    moisture: 50,
    sunlight: 'Partial Shade',
    status: 'Stable'
  });

  const [newLog, setNewLog] = useState<Partial<GrowthLog>>({
    note: '',
    height: undefined,
    healthScore: 5
  });
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlant = async () => {
      if (id && user) {
        try {
          const docRef = doc(db, 'plants', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().userId === user.uid) {
            setFormData(docSnap.data() as Plant);
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error("Error fetching plant:", error);
          navigate('/');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchPlant();
  }, [id, user, navigate]);

  useEffect(() => {
    if (id && isEditing) {
      const unsubscribe = subscribeToGrowthLogs(id, (data) => {
        setLogs(data);
      });
      return () => unsubscribe();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'moisture' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      if (isEditing && id) {
        await updatePlant(id, formData);
      } else {
        await addPlant({
          userId: user.uid,
          species: formData.species || 'Unknown Plant',
          moisture: formData.moisture || 50,
          sunlight: formData.sunlight as any || 'Partial Shade',
          status: formData.status as any || 'Stable'
        });
      }
      navigate('/');
    } catch (error) {
      console.error("Error saving record:", error);
      alert("Error saving record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this plant? This will not delete the logs automatically due to Firestore flat structure, but you should clean them up.")) {
      setSaving(true);
      try {
        if (id) {
          await deletePlant(id);
          navigate('/');
        }
      } catch (error) {
        console.error("Error deleting record:", error);
        alert("Error deleting record");
        setSaving(false);
      }
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    try {
      await addGrowthLog({
        plantId: id,
        userId: user.uid,
        note: newLog.note || '',
        height: newLog.height,
        healthScore: newLog.healthScore
      });
      setNewLog({ note: '', height: undefined, healthScore: 5 });
      setShowLogForm(false);
    } catch (err) {
      alert("Failed to add growth log");
    }
  };

  const startEditLog = (log: GrowthLog) => {
    setEditingLogId(log.id || null);
    setNewLog({ ...log });
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setNewLog({ note: '', height: undefined, healthScore: 5 });
  };

  const handleUpdateLog = async () => {
    if (!editingLogId) return;
    try {
      await updateGrowthLog(editingLogId, {
        note: newLog.note,
        height: newLog.height,
        healthScore: newLog.healthScore
      });
      cancelEditLog();
    } catch (err) {
      alert("Failed to update log");
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm("Delete this log?")) {
      try {
        await deleteGrowthLog(logId);
      } catch (err) {
        alert("Failed to delete log");
      }
    }
  };

  if (loading) {
    return <div className="flex-1 p-10 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 p-6 md:p-10 z-10 flex flex-col h-screen overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-4 mb-10 max-w-4xl mx-auto w-full">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-3xl font-light text-white">{isEditing ? 'Edit' : 'Add'} <span className="font-bold">Plant</span></h1>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8 pb-10">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Species / Name</label>
              <input 
                required
                type="text" 
                name="species"
                value={formData.species}
                onChange={handleChange}
                placeholder="e.g. Monstera Deliciosa"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Moisture Level ({formData.moisture}%)</label>
              <input 
                type="range" 
                name="moisture"
                min="0" max="100"
                value={formData.moisture}
                onChange={handleChange}
                className="w-full accent-emerald-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1 px-1">
                <span>Dry</span>
                <span>Optimal</span>
                <span>Wet</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Sunlight</label>
                <select 
                  name="sunlight"
                  value={formData.sunlight}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="Low Light" className="bg-slate-900">Low Light</option>
                  <option value="Partial Shade" className="bg-slate-900">Partial Shade</option>
                  <option value="Full Sun" className="bg-slate-900">Full Sun</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="Stable" className="bg-slate-900">Stable (Healthy)</option>
                  <option value="Thirsty" className="bg-slate-900">Thirsty</option>
                  <option value="Critical" className="bg-slate-900">Critical (Needs Care)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-6 border-t border-white/10">
              <button 
                type="submit" 
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Plant')}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  disabled={saving}
                  className="py-3 px-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-colors border border-red-500/30 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button 
                type="button" 
                onClick={() => navigate('/')}
                className="py-3 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
          
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] bg-emerald-500/10 pointer-events-none"></div>
        </div>

        {isEditing && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold">Growth Logs</h2>
              </div>
              {!showLogForm && !editingLogId && (
                <button 
                  onClick={() => setShowLogForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition font-bold text-xs uppercase tracking-widest border border-emerald-500/20"
                >
                  <Plus className="w-4 h-4" /> Add Log
                </button>
              )}
            </div>

            {(showLogForm || editingLogId) && (
              <div className="bg-black/20 border border-white/5 rounded-2xl p-6 mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">
                  {editingLogId ? 'Update Log' : 'New Growth Entry'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Notes</label>
                    <textarea 
                      value={newLog.note}
                      onChange={e => setNewLog(prev => ({ ...prev, note: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-h-[100px]"
                      placeholder="How is your plant doing?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Height (cm)</label>
                      <input 
                        type="number"
                        value={newLog.height || ''}
                        onChange={e => setNewLog(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Health Score (1-10)</label>
                      <input 
                        type="number"
                        min="1" max="10"
                        value={newLog.healthScore}
                        onChange={e => setNewLog(prev => ({ ...prev, healthScore: parseInt(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {editingLogId ? (
                      <>
                        <button onClick={handleUpdateLog} className="flex-1 py-2 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> UPDATE
                        </button>
                        <button onClick={cancelEditLog} className="px-4 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-lg hover:bg-white/10 transition">
                          CANCEL
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleAddLog} className="flex-1 py-2 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition flex items-center justify-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> SAVE ENTRY
                        </button>
                        <button onClick={() => setShowLogForm(false)} className="px-4 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-lg hover:bg-white/10 transition">
                          CANCEL
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-white/20 border border-dashed border-white/10 rounded-2xl italic">
                  No logs recorded for this plant yet.
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-2xl p-5 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-500/60" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditLog(log)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLog(log.id!)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed mb-3">{log.note}</p>
                    <div className="flex gap-4">
                      {log.height && (
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Height</span>
                          <span className="text-xs font-mono text-emerald-400">{log.height} cm</span>
                        </div>
                      )}
                      {log.healthScore && (
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Health</span>
                          <span className="text-xs font-mono text-blue-400">{log.healthScore}/10</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
