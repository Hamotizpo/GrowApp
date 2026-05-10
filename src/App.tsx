/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IoTSyncProvider } from './context/IoTSyncContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlantForm from './pages/PlantForm';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-teal-950 flex items-center justify-center text-emerald-400">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <IoTSyncProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/plants/new" 
              element={
                <ProtectedRoute>
                  <PlantForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/plants/:id" 
              element={
                <ProtectedRoute>
                  <PlantForm />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </IoTSyncProvider>
    </AuthProvider>
  );
}
