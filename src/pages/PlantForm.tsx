import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { addPlant, updatePlant, deletePlant } from '../services/plantService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plant } from '../types';

export default function PlantForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Plant>>({
    species: '',
    moisture: 50,
    sunlight: 'Partial Shade',
    status: 'Stable'
  });

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
    if (window.confirm("Are you sure you want to delete this plant?")) {
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

  if (loading) {
    return <div className="flex-1 p-10 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 p-6 md:p-10 z-10 flex flex-col h-screen overflow-y-auto">
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-3xl font-light text-white">{isEditing ? 'Edit' : 'Add'} <span className="font-bold">Plant</span></h1>
      </div>

      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 max-w-2xl mx-auto w-full relative overflow-hidden">
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
    </div>
  );
}
