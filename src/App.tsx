import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './part1-user-system/auth/AuthContext';
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
import TopRoleSwitcher from './part1-user-system/components/TopRoleSwitcher';
import ShelterApp from './part2-shelter-provider/ShelterApp';

import ServiceProviderRegistrationScreen from './part3-service-provider/registration/ServiceProviderRegistrationScreen';
import ServiceDashboardScreen from './part3-service-provider/dashboard/ServiceDashboardScreen';
import OrderCreationScreen from './part3-service-provider/orders/OrderCreationScreen';
import OrderDetailScreen from './part3-service-provider/orders/OrderDetailScreen';
import DispatchScreen from './part3-service-provider/dispatch/DispatchScreen';
import DeliveryConfirmationScreen from './part3-service-provider/dispatch/DeliveryConfirmationScreen';
import SOSDecodeScreen from './part3-service-provider/sos-decode/SOSDecodeScreen';

import './shared/design-tokens/tokens.css';
import './part1-user-system/styles/part1-base.css';
import './part3-service-provider/styles/part3-base.css';

/**
 * Protected route wrapper — redirects to role-select if no auth.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, vyntraUser, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (!user && !vyntraUser) return <Navigate to="/auth/role-select" replace />;
  return <>{children}</>;
}

/**
 * Smart default route — directs user based on active role and existing data.
 * If user has profile/registration data → go to their dashboard.
 * If user is signed in but no data → go to role select screen.
 * If not signed in → go to role select screen (which is now the landing page).
 */
function SmartDefaultRoute() {
  const { vyntraUser, activeRole, roleData, loading, roleDataLoading } = useAuth();

  if (loading || roleDataLoading) {
    return <div className="loading-screen"><div className="loading-spinner" /></div>;
  }

  if (!vyntraUser) {
    return <Navigate to="/auth/role-select" replace />;
  }

  // If the user has data for their active role, go directly to their dashboard
  switch (activeRole) {
    case 'user':
      if (roleData.userProfile) return <Navigate to="/user/home" replace />;
      break;
    case 'shelter-provider':
      if (roleData.shelterProvider) return <Navigate to="/shelter/dashboard" replace />;
      break;
    case 'service-provider':
      if (roleData.serviceProvider) return <Navigate to="/service/dashboard" replace />;
      break;
  }

  // Otherwise, go to role selection
  return <Navigate to="/auth/role-select" replace />;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <TopRoleSwitcher />
      <ConnectivityBadge />
      <Routes>
        {/* Role Select — LANDING PAGE (no auth required) */}
        <Route path="/auth/role-select" element={<RoleSelectScreen />} />

        {/* Legacy login route — redirect to role-select */}
        <Route path="/auth/login" element={<Navigate to="/auth/role-select" replace />} />

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

        {/* Part 3: Service Provider, Orders & Dispatch */}
        <Route path="/service/register" element={<ProtectedRoute><ServiceProviderRegistrationScreen /></ProtectedRoute>} />
        <Route path="/service/dashboard" element={<ProtectedRoute><ServiceDashboardScreen /></ProtectedRoute>} />
        <Route path="/service/sos-decode" element={<ProtectedRoute><SOSDecodeScreen /></ProtectedRoute>} />
        <Route path="/service" element={<Navigate to="/service/dashboard" replace />} />

        {/* Part 3: Orders */}
        <Route path="/orders/create" element={<ProtectedRoute><OrderCreationScreen /></ProtectedRoute>} />
        <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetailScreen /></ProtectedRoute>} />

        {/* Part 3: Dispatch & Delivery */}
        <Route path="/dispatch/:orderId" element={<ProtectedRoute><DispatchScreen /></ProtectedRoute>} />
        <Route path="/dispatch/confirm/:orderId" element={<ProtectedRoute><DeliveryConfirmationScreen /></ProtectedRoute>} />

        {/* Smart default — routes based on role + data */}
        <Route path="/" element={<SmartDefaultRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
