import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './part1-user-system/auth/AuthContext';
import LoginScreen from './part1-user-system/auth/LoginScreen';
import RoleSelectScreen from './part1-user-system/auth/RoleSelectScreen';
import HomeScreen from './part1-user-system/sos/HomeScreen';
import ProfileCreateScreen from './part1-user-system/profile/ProfileCreateScreen';
import ProfileViewScreen from './part1-user-system/profile/ProfileViewScreen';
import TrackerHomeScreen from './part1-user-system/menstrual-tracker/TrackerHomeScreen';
import ChatEntryScreen from './part1-user-system/world-chat/ChatEntryScreen';
import DistrictChatScreen from './part1-user-system/world-chat/DistrictChatScreen';
import SOSConditionsScreen from './part1-user-system/sos/SOSConditionsScreen';
import SOSShelterSelectScreen from './part1-user-system/sos/SOSShelterSelectScreen';
import ConnectivityBadge from './part1-user-system/components/ConnectivityBadge';
import ShelterApp from './part2-shelter-provider/ShelterApp';

import './shared/design-tokens/tokens.css';
import './part1-user-system/styles/part1-base.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, vyntraUser, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (!user && !vyntraUser) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <ConnectivityBadge />
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginScreen />} />
        <Route path="/auth/role-select" element={<ProtectedRoute><RoleSelectScreen /></ProtectedRoute>} />

        {/* User Routes (Part 1) */}
        <Route path="/user/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/user/profile/create" element={<ProtectedRoute><ProfileCreateScreen /></ProtectedRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute><ProfileViewScreen /></ProtectedRoute>} />

        {/* Menstrual Tracker */}
        <Route path="/user/cycle-tracker" element={<ProtectedRoute><TrackerHomeScreen /></ProtectedRoute>} />

        {/* World Chat */}
        <Route path="/chat" element={<ProtectedRoute><ChatEntryScreen /></ProtectedRoute>} />
        <Route path="/chat/:districtCode" element={<ProtectedRoute><DistrictChatScreen /></ProtectedRoute>} />

        {/* SOS */}
        <Route path="/sos/conditions" element={<ProtectedRoute><SOSConditionsScreen /></ProtectedRoute>} />
        <Route path="/sos/shelters" element={<ProtectedRoute><SOSShelterSelectScreen /></ProtectedRoute>} />

        {/* Part 2: Shelter Provider Module */}
        <Route path="/shelter/*" element={<ShelterApp />} />

        {/* Placeholder routes for Part 3 */}
        <Route path="/service/*" element={<div className="placeholder-screen"><h2>Service Provider Module</h2><p>Part 3 — Rapid Dispatch & Resource Logistics (Coming Soon)</p></div>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
